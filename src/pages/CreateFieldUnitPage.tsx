import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Search } from 'lucide-react'
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
  const [loadingInit, setLoadingInit] = useState(true)
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Drug search state
  const [drugSearch, setDrugSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([getActiveUnitTypes(), getActiveDrugs()])
      .then(([ut, dr]) => {
        setUnitTypes(ut)
        setDrugs(dr)
      })
      .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoadingInit(false))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
    } catch {
      toast.error('โหลดชุดยาเริ่มต้นไม่สำเร็จ')
    } finally {
      setLoadingSet(false)
    }
  }

  const usedDrugIds = useMemo(() => new Set(items.map(i => i.drugId)), [items])

  const filteredDrugs = useMemo(() => {
    const available = drugs.filter(d => !usedDrugIds.has(d.id))
    const q = drugSearch.trim().toLowerCase()
    if (!q) return available.slice(0, 20)
    return available.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.genericName.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.strength.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [drugs, usedDrugIds, drugSearch])

  function handleAddDrug(drug: Drug) {
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
    setDrugSearch('')
    setSearchOpen(false)
  }

  function handleRemoveItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function handleQtyChange(idx: number, val: string) {
    const qty = parseInt(val, 10)
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, qtyPerSet: isNaN(qty) ? item.qtyPerSet : Math.max(1, qty) } : item
    ))
  }

  function handleItemNoteChange(idx: number, note: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, note } : item))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.unitTypeId) e.unitTypeId = 'กรุณาเลือกประเภทหน่วย'
    if (!form.eventDate) e.eventDate = 'กรุณาระบุวันที่ออกหน่วย'
    if (!form.responsiblePerson.trim()) e.responsiblePerson = 'กรุณาระบุผู้รับผิดชอบ'
    if (!form.numberOfSets || form.numberOfSets <= 0) e.numberOfSets = 'จำนวนชุดต้องมากกว่า 0'
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
    } catch {
      toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  if (loadingInit) return <div className="flex justify-center py-16"><Spinner size={24} /></div>

  const totalAvailable = drugs.filter(d => !usedDrugIds.has(d.id)).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">จัดยาออกหน่วย</h1>
        <p className="text-sm text-muted mt-0.5">สร้างรายการจัดเตรียมยาสำหรับหน่วยออกปฏิบัติ</p>
      </div>

      {/* Form fields */}
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

      {/* Drug items */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">รายการยา</h2>
            {items.length > 0 && (
              <span className="text-xs bg-surface-soft text-muted px-2 py-0.5 rounded-full">
                {items.length} รายการ
              </span>
            )}
          </div>
          {loadingSet && <Spinner size={16} />}
        </div>

        {errors.items && (
          <p className="text-xs text-error mb-3">{errors.items}</p>
        )}

        {items.length === 0 && !loadingSet && (
          <div className="flex items-center justify-center border border-dashed border-hairline rounded-lg py-8 mb-4 text-sm text-muted">
            {form.unitTypeId
              ? 'ประเภทหน่วยนี้ยังไม่มีชุดยาเริ่มต้น — เพิ่มยาเองได้ด้านล่าง'
              : 'เลือกประเภทหน่วยเพื่อโหลดชุดยาเริ่มต้นอัตโนมัติ'}
          </div>
        )}

        {items.length > 0 && (
          <div className="border border-hairline rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-soft border-b border-hairline">
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted w-7">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted">ชื่อยา</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-muted w-24">จำนวน/ชุด</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-muted w-20">รวม</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted w-16">หน่วย</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted">หมายเหตุ</th>
                  <th className="px-3 py-2.5 w-9" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className={`border-b border-hairline last:border-0 ${idx % 2 !== 0 ? 'bg-surface-soft/30' : ''}`}>
                    <td className="px-3 py-2.5 text-center text-xs text-muted">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-ink">{item.drugNameSnapshot}</p>
                      {(item.strengthSnapshot || item.dosageFormSnapshot) && (
                        <p className="text-xs text-muted mt-0.5">
                          {[item.strengthSnapshot, item.dosageFormSnapshot].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qtyPerSet}
                        onChange={e => handleQtyChange(idx, e.target.value)}
                        className="w-20 text-center border border-hairline rounded-md px-2 py-1 text-sm focus:outline-none focus:border-ink"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-ink">
                      {item.qtyPerSet * (form.numberOfSets || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-muted text-sm">{item.unitSnapshot}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.note}
                        onChange={e => handleItemNoteChange(idx, e.target.value)}
                        placeholder="หมายเหตุ..."
                        className="w-full border border-hairline rounded-md px-2 py-1 text-xs focus:outline-none focus:border-ink bg-transparent placeholder:text-muted-soft"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
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

        {/* Searchable drug picker */}
        <div className="relative" ref={searchRef}>
          <label className="text-sm font-medium text-ink block mb-1.5">เพิ่มรายการยา</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder={`ค้นหายาโดยชื่อ, ชื่อสามัญ, ความแรง... (${totalAvailable} รายการ)`}
              value={drugSearch}
              onChange={e => { setDrugSearch(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              className="w-full h-10 pl-9 pr-3 rounded-md border border-hairline bg-white text-sm text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink placeholder:text-muted-soft"
            />
          </div>

          {searchOpen && drugSearch.trim() !== '' && filteredDrugs.length === 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-hairline rounded-lg shadow-lg z-50">
              <div className="px-4 py-3 text-sm text-muted">ไม่พบรายการที่ค้นหา</div>
            </div>
          )}

          {searchOpen && filteredDrugs.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-hairline rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
              {filteredDrugs.map(drug => (
                <button
                  key={drug.id}
                  type="button"
                  onMouseDown={() => handleAddDrug(drug)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-soft text-sm border-b border-hairline last:border-0 transition-colors flex items-baseline gap-2"
                >
                  <span className="font-medium text-ink shrink-0">{drug.name}</span>
                  {(drug.strength || drug.dosageForm) && (
                    <span className="text-xs text-muted truncate">
                      {[drug.strength, drug.dosageForm].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <Plus size={13} className="ml-auto shrink-0 text-muted" />
                </button>
              ))}
              {!drugSearch.trim() && totalAvailable > 20 && (
                <div className="px-4 py-2 text-xs text-muted bg-surface-soft border-t border-hairline">
                  แสดง 20 จาก {totalAvailable} รายการ — พิมพ์เพื่อค้นหา
                </div>
              )}
            </div>
          )}
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
