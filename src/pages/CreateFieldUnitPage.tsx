import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import {
  getActiveUnitTypes,
  getDefaultSetByUnitType,
  getDefaultSetItems,
  getActiveDrugs,
  createFieldUnit,
  writeActivityLog,
} from '../firebase/firestore'
import { useAuthContext } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { toast } from 'sonner'
import { getThaiFiscalYear } from '../utils/fiscalYear'
import { todayISOString } from '../utils/date'
import type { UnitType } from '../types/unit'
import type { Drug } from '../types/drug'
import type { FieldUnitFormData, FieldUnitItemDraft } from '../types/fieldUnit'

export function CreateFieldUnitPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [loadingSet, setLoadingSet] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<FieldUnitFormData>({
    unitTypeId: '',
    unitTypeName: '',
    eventDate: todayISOString(),
    location: '',
    responsiblePerson: '',
    numberOfSets: 1,
    note: '',
  })
  const [items, setItems] = useState<FieldUnitItemDraft[]>([])
  const [addDrugId, setAddDrugId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([getActiveUnitTypes(), getActiveDrugs()]).then(([ut, dr]) => {
      setUnitTypes(ut)
      setDrugs(dr)
      setLoadingTypes(false)
    })
  }, [])

  async function handleUnitTypeChange(unitTypeId: string) {
    const ut = unitTypes.find(u => u.id === unitTypeId)
    setForm(f => ({ ...f, unitTypeId, unitTypeName: ut?.name ?? '' }))
    setItems([])
    if (!unitTypeId) return
    setLoadingSet(true)
    try {
      const set = await getDefaultSetByUnitType(unitTypeId)
      if (set) {
        const defaultItems = await getDefaultSetItems(set.id)
        setItems(defaultItems.map((si, idx) => {
          const drug = drugs.find(d => d.id === si.drugId)
          return {
            drugId: si.drugId,
            drugCodeSnapshot: drug?.code ?? '',
            drugNameSnapshot: si.drugNameSnapshot,
            genericNameSnapshot: drug?.genericName ?? '',
            tradeNameSnapshot: drug?.tradeName ?? '',
            strengthSnapshot: si.strengthSnapshot,
            dosageFormSnapshot: si.dosageFormSnapshot,
            unitSnapshot: si.unitSnapshot,
            pricePerUnitSnapshot: drug?.pricePerUnit ?? 0,
            instructionSnapshot: drug?.instruction ?? '',
            warningSnapshot: drug?.warning ?? '',
            labelNoteSnapshot: drug?.labelNote ?? '',
            qtyPerSet: si.qtyPerSet,
            note: si.note,
            sortOrder: idx,
          }
        }))
      }
    } finally {
      setLoadingSet(false)
    }
  }

  function handleAddDrug() {
    if (!addDrugId) return
    const drug = drugs.find(d => d.id === addDrugId)
    if (!drug) return
    if (items.some(i => i.drugId === addDrugId)) {
      toast.error('ยานี้มีในรายการแล้ว')
      return
    }
    setItems(prev => [...prev, {
      drugId: drug.id,
      drugCodeSnapshot: drug.code,
      drugNameSnapshot: drug.name,
      genericNameSnapshot: drug.genericName,
      tradeNameSnapshot: drug.tradeName,
      strengthSnapshot: drug.strength,
      dosageFormSnapshot: drug.dosageForm,
      unitSnapshot: drug.unit,
      pricePerUnitSnapshot: drug.pricePerUnit,
      instructionSnapshot: drug.instruction,
      warningSnapshot: drug.warning,
      labelNoteSnapshot: drug.labelNote,
      qtyPerSet: 1,
      note: '',
      sortOrder: prev.length,
    }])
    setAddDrugId('')
  }

  function handleRemoveItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function handleQtyChange(idx: number, qty: number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, qtyPerSet: qty } : item))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.unitTypeId) e.unitTypeId = 'กรุณาเลือกประเภทหน่วย'
    if (!form.eventDate) e.eventDate = 'กรุณาระบุวันที่ออกหน่วย'
    if (!form.responsiblePerson.trim()) e.responsiblePerson = 'กรุณาระบุผู้รับผิดชอบ'
    if (form.numberOfSets <= 0) e.numberOfSets = 'จำนวนชุดต้องมากกว่า 0'
    if (items.length === 0) e.items = 'กรุณาเพิ่มรายการยาอย่างน้อย 1 รายการ'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }
    if (!user) return
    setSaving(true)
    try {
      const fiscalYear = getThaiFiscalYear(form.eventDate)
      const id = await createFieldUnit(form, items, user.uid, user.displayName, fiscalYear)
      await writeActivityLog('create_field_unit', `จัดยาออกหน่วย ${form.unitTypeName}`, user.uid, user.username)
      toast.success('บันทึกรายการสำเร็จ')
      navigate(`/field-units/${id}`)
    } catch { toast.error('บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  if (loadingTypes) return <div className="flex justify-center py-16"><Spinner size={24} /></div>

  const usedDrugIds = new Set(items.map(i => i.drugId))
  const availableDrugs = drugs.filter(d => !usedDrugIds.has(d.id))
  const drugOptions = availableDrugs.map(d => ({
    value: d.id,
    label: `${d.name}${d.strength ? ` ${d.strength}` : ''}${d.dosageForm ? ` (${d.dosageForm})` : ''}`,
  }))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">จัดยาออกหน่วย</h1>
        <p className="text-sm text-muted mt-0.5">สร้างรายการจัดเตรียมยาสำหรับหน่วยออกปฏิบัติ</p>
      </div>

      {/* Form */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-ink mb-4">ข้อมูลการออกหน่วย</h2>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="ประเภทหน่วย *"
            options={unitTypes.map(u => ({ value: u.id, label: u.name }))}
            placeholder="-- เลือกประเภทหน่วย --"
            value={form.unitTypeId}
            onChange={e => handleUnitTypeChange(e.target.value)}
            error={errors.unitTypeId}
          />
          <Input
            label="วันที่ออกหน่วย *"
            type="date"
            value={form.eventDate}
            onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
            error={errors.eventDate}
          />
          <Input
            label="สถานที่"
            placeholder="ระบุสถานที่"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          />
          <Input
            label="ผู้รับผิดชอบ *"
            placeholder="ชื่อ-สกุล"
            value={form.responsiblePerson}
            onChange={e => setForm(f => ({ ...f, responsiblePerson: e.target.value }))}
            error={errors.responsiblePerson}
          />
          <Input
            label="จำนวนชุด *"
            type="number"
            min="1"
            value={String(form.numberOfSets)}
            onChange={e => setForm(f => ({ ...f, numberOfSets: Number(e.target.value) }))}
            error={errors.numberOfSets}
          />
          <Input
            label="หมายเหตุ"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </div>
      </Card>

      {/* Items */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">รายการยา</h2>
          {loadingSet && <Spinner size={16} />}
        </div>

        {errors.items && (
          <p className="text-xs text-error mb-3">{errors.items}</p>
        )}

        {items.length > 0 && (
          <div className="border border-hairline rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-surface-soft">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">ชื่อยา</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">ความแรง / รูปแบบ</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted">จำนวน/ชุด</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted">จำนวนรวม</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">หน่วย</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className={`border-b border-hairline last:border-0 ${idx % 2 === 0 ? '' : 'bg-surface-soft/30'}`}>
                    <td className="px-4 py-2.5 font-medium text-ink">{item.drugNameSnapshot}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {[item.strengthSnapshot, item.dosageFormSnapshot].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qtyPerSet}
                        onChange={e => handleQtyChange(idx, Number(e.target.value))}
                        className="w-20 text-center border border-hairline rounded-md px-2 py-1 text-sm focus:outline-none focus:border-ink"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-ink">
                      {item.qtyPerSet * form.numberOfSets}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{item.unitSnapshot}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 rounded text-muted hover:text-error hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add drug */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Select
              options={drugOptions}
              placeholder="-- เพิ่มยา --"
              value={addDrugId}
              onChange={e => setAddDrugId(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="md" onClick={handleAddDrug} disabled={!addDrugId}>
            <Plus size={16} />
            เพิ่ม
          </Button>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>ยกเลิก</Button>
        <Button onClick={handleSave} loading={saving}>บันทึกรายการ</Button>
      </div>
    </div>
  )
}
