import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Trash2, Search, CheckCircle, XCircle } from 'lucide-react'
import {
  getAllUnitTypes,
  createUnitType,
  updateUnitType,
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
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { toast } from 'sonner'
import type { UnitType, UnitTypeFormData, DefaultSet, DefaultSetItem } from '../types/unit'
import type { Drug } from '../types/drug'

const emptyUnitTypeForm: UnitTypeFormData = { name: '', description: '', active: true, sortOrder: 0 }

export function UnitTypesPage() {
  const { user } = useAuthContext()

  // Unit type list
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [loadingList, setLoadingList] = useState(true)

  // Selected unit type
  const [selected, setSelected] = useState<UnitType | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Unit type form
  const [utForm, setUtForm] = useState<UnitTypeFormData>(emptyUnitTypeForm)
  const [utFormErrors, setUtFormErrors] = useState<Record<string, string>>({})
  const [savingUt, setSavingUt] = useState(false)

  // Drug list for selected unit type
  const [defaultSet, setDefaultSet] = useState<DefaultSet | null>(null)
  const [items, setItems] = useState<DefaultSetItem[]>([])
  const [loadingSet, setLoadingSet] = useState(false)

  // All drugs (for search picker)
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [drugSearch, setDrugSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // ─── Load ────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getAllUnitTypes(), getActiveDrugs()])
      .then(([ut, dr]) => { setUnitTypes(ut); setDrugs(dr) })
      .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoadingList(false))
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

  async function reloadList() {
    const ut = await getAllUnitTypes()
    setUnitTypes(ut)
  }

  async function selectUnitType(ut: UnitType) {
    setSelected(ut)
    setIsAdding(false)
    setUtForm({ name: ut.name, description: ut.description, active: ut.active, sortOrder: ut.sortOrder })
    setUtFormErrors({})
    setItems([])
    setDefaultSet(null)
    setLoadingSet(true)
    try {
      if (!user) return
      const set = await getOrCreateDefaultSet(ut.id, ut.name, user.uid)
      setDefaultSet(set)
      setItems(await getDefaultSetItems(set.id))
    } catch {
      toast.error('โหลดชุดยาไม่สำเร็จ')
    } finally {
      setLoadingSet(false)
    }
  }

  // ─── Unit type form ───────────────────────────────────────────────────────

  function startAdding() {
    setSelected(null)
    setIsAdding(true)
    setUtForm(emptyUnitTypeForm)
    setUtFormErrors({})
    setItems([])
    setDefaultSet(null)
  }

  async function handleSaveUnitType() {
    if (!user) return
    const errors: Record<string, string> = {}
    if (!utForm.name.trim()) errors.name = 'กรุณากรอกชื่อประเภทหน่วย'
    if (Object.keys(errors).length) { setUtFormErrors(errors); return }

    setSavingUt(true)
    try {
      if (isAdding) {
        const id = await createUnitType(utForm, user.uid)
        await writeActivityLog('create_unit_type', `เพิ่มประเภทหน่วย ${utForm.name}`, user.uid, user.username)
        toast.success('เพิ่มประเภทหน่วยสำเร็จ')
        await reloadList()
        // Auto-select the new unit type
        const fresh = await getAllUnitTypes()
        setUnitTypes(fresh)
        const newUt = fresh.find(u => u.id === id)
        if (newUt) selectUnitType(newUt)
        else setIsAdding(false)
      } else if (selected) {
        await updateUnitType(selected.id, utForm, user.uid)
        await writeActivityLog('update_unit_type', `แก้ไขประเภทหน่วย ${utForm.name}`, user.uid, user.username)
        toast.success('บันทึกสำเร็จ')
        await reloadList()
        setSelected(prev => prev ? { ...prev, ...utForm } : null)
      }
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSavingUt(false)
    }
  }

  async function handleToggleActive(ut: UnitType, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    try {
      await updateUnitType(ut.id, { active: !ut.active }, user.uid)
      toast.success(ut.active ? 'ปิดใช้งานแล้ว' : 'เปิดใช้งานแล้ว')
      await reloadList()
      if (selected?.id === ut.id) {
        setSelected(prev => prev ? { ...prev, active: !ut.active } : null)
        setUtForm(f => ({ ...f, active: !ut.active }))
      }
    } catch {
      toast.error('ไม่สำเร็จ')
    }
  }

  // ─── Drug list management ─────────────────────────────────────────────────

  const usedDrugIds = useMemo(() => new Set(items.map(i => i.drugId)), [items])

  const filteredDrugs = useMemo(() => {
    const available = drugs.filter(d => !usedDrugIds.has(d.id))
    const q = drugSearch.trim().toLowerCase()
    if (!q) return available.slice(0, 20)
    return available.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.genericName.toLowerCase().includes(q) ||
      d.strength.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [drugs, usedDrugIds, drugSearch])

  async function handleAddDrug(drug: Drug) {
    if (!defaultSet || !user) return
    setSearchOpen(false)
    setDrugSearch('')
    try {
      await addDefaultSetItem({
        setId: defaultSet.id,
        unitTypeId: defaultSet.unitTypeId,
        drugId: drug.id,
        drugNameSnapshot: drug.name,
        strengthSnapshot: drug.strength,
        dosageFormSnapshot: drug.dosageForm,
        unitSnapshot: drug.unit,
        qtyPerSet: 1,
        note: '',
        active: true,
        sortOrder: items.length,
      })
      await writeActivityLog('update_default_set', `เพิ่มยา ${drug.name}`, user.uid, user.username)
      setItems(await getDefaultSetItems(defaultSet.id))
    } catch {
      toast.error('เพิ่มยาไม่สำเร็จ')
    }
  }

  async function handleQtyChange(item: DefaultSetItem, qty: number) {
    if (qty <= 0) return
    try {
      await updateDefaultSetItem(item.id, { qtyPerSet: qty })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, qtyPerSet: qty } : i))
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  async function handleDeleteItem(item: DefaultSetItem) {
    if (!confirm(`ลบ "${item.drugNameSnapshot}" ออกจากชุดยา?`)) return
    try {
      await deleteDefaultSetItem(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      toast.success('ลบสำเร็จ')
    } catch {
      toast.error('ลบไม่สำเร็จ')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const totalAvailable = drugs.filter(d => !usedDrugIds.has(d.id)).length

  return (
    <div className="flex h-full">
      {/* ── Left panel: unit type list ── */}
      <div className="w-56 border-r border-hairline flex flex-col bg-white flex-shrink-0">
        <div className="px-4 py-4 border-b border-hairline flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">ประเภทหน่วย</h2>
          <button
            onClick={startAdding}
            className="p-1 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition-colors"
            title="เพิ่มประเภทหน่วย"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loadingList ? (
            <div className="flex justify-center py-8"><Spinner size={20} /></div>
          ) : (
            unitTypes.map(ut => {
              const isSelected = (selected?.id === ut.id && !isAdding)
              return (
                <button
                  key={ut.id}
                  onClick={() => selectUnitType(ut)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2 text-sm transition-colors ${
                    isSelected
                      ? 'bg-surface-card text-ink font-medium'
                      : 'text-muted hover:bg-surface-soft hover:text-ink'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ut.active ? 'bg-success' : 'bg-muted-soft'}`}
                  />
                  <span className="truncate">{ut.name}</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto">
        {!selected && !isAdding ? (
          <div className="flex items-center justify-center h-full text-sm text-muted">
            เลือกประเภทหน่วยจากรายการทางซ้าย หรือกด + เพื่อเพิ่มใหม่
          </div>
        ) : (
          <div className="p-6 max-w-3xl">
            {/* Unit type form */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-base font-semibold text-ink">
                {isAdding ? 'เพิ่มประเภทหน่วยใหม่' : utForm.name}
              </h1>
              <div className="flex items-center gap-2">
                {selected && (
                  <button
                    onClick={e => handleToggleActive(selected, e)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      utForm.active
                        ? 'border-hairline text-muted hover:text-error hover:border-error'
                        : 'border-hairline text-muted hover:text-success hover:border-success'
                    }`}
                  >
                    {utForm.active ? <><XCircle size={13} /> ปิดใช้งาน</> : <><CheckCircle size={13} /> เปิดใช้งาน</>}
                  </button>
                )}
                <Button size="sm" onClick={handleSaveUnitType} loading={savingUt}>
                  บันทึก
                </Button>
              </div>
            </div>

            <div className="bg-white border border-hairline rounded-xl p-5 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    label="ชื่อประเภทหน่วย *"
                    placeholder="เช่น ปฐมพยาบาล"
                    value={utForm.name}
                    onChange={e => setUtForm(f => ({ ...f, name: e.target.value }))}
                    error={utFormErrors.name}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="คำอธิบาย"
                    placeholder="รายละเอียดเพิ่มเติม"
                    value={utForm.description}
                    onChange={e => setUtForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <Input
                  label="ลำดับการแสดง"
                  type="number"
                  min="0"
                  value={String(utForm.sortOrder)}
                  onChange={e => setUtForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={utForm.active}
                      onChange={e => setUtForm(f => ({ ...f, active: e.target.checked }))}
                      className="w-4 h-4 rounded border-hairline"
                    />
                    <span className="text-sm text-ink">ใช้งาน</span>
                    <Badge variant={utForm.active ? 'success' : 'default'}>
                      {utForm.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </label>
                </div>
              </div>
            </div>

            {/* Drug list — only shown when editing an existing unit type */}
            {!isAdding && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">รายการยาประจำหน่วย</h2>
                    {items.length > 0 && (
                      <span className="text-xs bg-surface-soft text-muted px-2 py-0.5 rounded-full">
                        {items.length} รายการ
                      </span>
                    )}
                  </div>
                  {loadingSet && <Spinner size={14} />}
                </div>

                {!loadingSet && items.length > 0 && (
                  <div className="bg-white border border-hairline rounded-xl overflow-hidden mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-soft border-b border-hairline">
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted w-7">#</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">ชื่อยา</th>
                          <th className="text-center px-4 py-2.5 text-xs font-medium text-muted w-24">จำนวน/ชุด</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted w-16">หน่วย</th>
                          <th className="px-4 py-2.5 w-9" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.id} className={`border-b border-hairline last:border-0 ${idx % 2 !== 0 ? 'bg-surface-soft/30' : ''}`}>
                            <td className="px-4 py-2.5 text-center text-xs text-muted">{idx + 1}</td>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-ink">{item.drugNameSnapshot}</p>
                              {(item.strengthSnapshot || item.dosageFormSnapshot) && (
                                <p className="text-xs text-muted mt-0.5">
                                  {[item.strengthSnapshot, item.dosageFormSnapshot].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.qtyPerSet}
                                onChange={e => handleQtyChange(item, Number(e.target.value))}
                                className="w-20 text-center border border-hairline rounded-md px-2 py-1 text-sm focus:outline-none focus:border-ink"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-muted text-sm">{item.unitSnapshot}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
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

                {!loadingSet && items.length === 0 && (
                  <div className="flex items-center justify-center border border-dashed border-hairline rounded-xl py-8 mb-4 text-sm text-muted">
                    ยังไม่มีรายการยา — เพิ่มยาด้านล่าง
                  </div>
                )}

                {/* Drug search picker */}
                {!loadingSet && (
                  <div className="relative" ref={searchRef}>
                    <label className="text-sm font-medium text-ink block mb-1.5">เพิ่มยา</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder={`ค้นหายา... (${totalAvailable} รายการ)`}
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
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-hairline rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
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
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
