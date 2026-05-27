import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import {
  getActiveUnitTypes,
  getOrCreateDefaultSet,
  getDefaultSetItems,
  addDefaultSetItem,
  updateDefaultSetItem,
  deleteDefaultSetItem,
  getActiveDrugs,
  writeActivityLog,
} from '../firebase/firestore'
import { useAuthContext } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { toast } from 'sonner'
import type { UnitType, DefaultSet, DefaultSetItem } from '../types/unit'
import type { Drug } from '../types/drug'

export function DefaultSetsPage() {
  const { user } = useAuthContext()
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [selectedUnitTypeId, setSelectedUnitTypeId] = useState('')
  const [defaultSet, setDefaultSet] = useState<DefaultSet | null>(null)
  const [items, setItems] = useState<DefaultSetItem[]>([])
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ drugId: '', qtyPerSet: 1, note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getActiveUnitTypes(), getActiveDrugs()]).then(([ut, dr]) => {
      setUnitTypes(ut)
      setDrugs(dr)
    })
  }, [])

  async function loadSet(unitTypeId: string) {
    if (!unitTypeId || !user) return
    setLoading(true)
    try {
      const ut = unitTypes.find(u => u.id === unitTypeId)
      const set = await getOrCreateDefaultSet(unitTypeId, ut?.name ?? '', user.uid)
      setDefaultSet(set)
      setItems(await getDefaultSetItems(set.id))
    } catch {
      toast.error('โหลดชุดยาไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUnitTypeId) loadSet(selectedUnitTypeId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitTypeId])

  async function handleAdd() {
    if (!addForm.drugId) { toast.error('กรุณาเลือกยา'); return }
    if (addForm.qtyPerSet <= 0) { toast.error('จำนวนต้องมากกว่า 0'); return }
    if (!defaultSet || !user) return
    setSaving(true)
    try {
      const drug = drugs.find(d => d.id === addForm.drugId)!
      await addDefaultSetItem({
        setId: defaultSet.id,
        unitTypeId: selectedUnitTypeId,
        drugId: addForm.drugId,
        drugNameSnapshot: drug.name,
        strengthSnapshot: drug.strength,
        dosageFormSnapshot: drug.dosageForm,
        unitSnapshot: drug.unit,
        qtyPerSet: addForm.qtyPerSet,
        note: addForm.note,
        active: true,
        sortOrder: items.length,
      })
      await writeActivityLog('update_default_set', `เพิ่มยา ${drug.name} ในชุดยา`, user.uid, user.username)
      toast.success('เพิ่มยาในชุดยาสำเร็จ')
      setAddForm({ drugId: '', qtyPerSet: 1, note: '' })
      setAddModalOpen(false)
      setItems(await getDefaultSetItems(defaultSet.id))
    } catch { toast.error('เพิ่มไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function handleDelete(item: DefaultSetItem) {
    if (!confirm(`ลบ "${item.drugNameSnapshot}" ออกจากชุดยา?`)) return
    try {
      await deleteDefaultSetItem(item.id)
      toast.success('ลบสำเร็จ')
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch { toast.error('ลบไม่สำเร็จ') }
  }

  async function handleQtyChange(item: DefaultSetItem, qty: number) {
    if (qty <= 0) return
    try {
      await updateDefaultSetItem(item.id, { qtyPerSet: qty })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, qtyPerSet: qty } : i))
    } catch { toast.error('บันทึกไม่สำเร็จ') }
  }

  const drugOptions = drugs.map(d => ({
    value: d.id,
    label: `${d.name}${d.strength ? ` ${d.strength}` : ''}${d.dosageForm ? ` (${d.dosageForm})` : ''}`,
  }))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">ชุดยาเริ่มต้น</h1>
          <p className="text-sm text-muted mt-0.5">กำหนดยาประจำแต่ละประเภทหน่วย</p>
        </div>
      </div>

      {/* Select unit type */}
      <div className="mb-6 max-w-sm">
        <Select
          label="เลือกประเภทหน่วย"
          options={unitTypes.map(u => ({ value: u.id, label: u.name }))}
          placeholder="-- เลือกประเภทหน่วย --"
          value={selectedUnitTypeId}
          onChange={e => setSelectedUnitTypeId(e.target.value)}
        />
      </div>

      {!selectedUnitTypeId && (
        <EmptyState title="เลือกประเภทหน่วยเพื่อจัดการชุดยา" />
      )}

      {selectedUnitTypeId && loading && (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      )}

      {selectedUnitTypeId && !loading && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">
              รายการยาในชุด: <span className="font-semibold text-ink">{items.length} รายการ</span>
            </p>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus size={14} />
              เพิ่มยา
            </Button>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="ยังไม่มียาในชุดยานี้"
              description="กดปุ่มเพิ่มยาเพื่อเริ่มกำหนดชุดยา"
            />
          ) : (
            <div className="bg-white border border-hairline rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-surface-soft">
                    <th className="px-4 py-3 w-8" />
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted">ชื่อยา</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted">ความแรง / รูปแบบ</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted">จำนวน/ชุด</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted">หน่วย</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className={`border-b border-hairline last:border-0 ${idx % 2 === 0 ? '' : 'bg-surface-soft/30'}`}>
                      <td className="px-4 py-3 text-muted">
                        <GripVertical size={14} />
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{item.drugNameSnapshot}</td>
                      <td className="px-4 py-3 text-muted">
                        {[item.strengthSnapshot, item.dosageFormSnapshot].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qtyPerSet}
                          onChange={e => handleQtyChange(item, Number(e.target.value))}
                          className="w-20 text-center border border-hairline rounded-md px-2 py-1 text-sm focus:outline-none focus:border-ink"
                        />
                      </td>
                      <td className="px-4 py-3 text-muted">{item.unitSnapshot}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(item)}
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
        </>
      )}

      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="เพิ่มยาในชุดยา"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="เลือกยา *"
            options={drugOptions}
            placeholder="-- เลือกยา --"
            value={addForm.drugId}
            onChange={e => setAddForm(f => ({ ...f, drugId: e.target.value }))}
          />
          <Input
            label="จำนวนต่อชุด *"
            type="number"
            min="1"
            value={String(addForm.qtyPerSet)}
            onChange={e => setAddForm(f => ({ ...f, qtyPerSet: Number(e.target.value) }))}
          />
          <Input
            label="หมายเหตุ"
            value={addForm.note}
            onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)} disabled={saving}>ยกเลิก</Button>
            <Button onClick={handleAdd} loading={saving}>เพิ่มยา</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
