import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Pencil, XCircle, CheckCircle } from 'lucide-react'
import { getAllDrugs, createDrug, updateDrug, deactivateDrug, writeActivityLog } from '../firebase/firestore'
import { useAuthContext } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { toast } from 'sonner'
import type { Drug, DrugFormData } from '../types/drug'

const emptyForm: DrugFormData = {
  code: '',
  name: '',
  genericName: '',
  tradeName: '',
  strength: '',
  dosageForm: '',
  unit: '',
  pricePerUnit: 0,
  instruction: '',
  warning: '',
  labelNote: '',
  active: true,
}

function DrugForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: DrugFormData
  onSave: (d: DrugFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<DrugFormData>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof DrugFormData, string>>>({})

  function validate() {
    const e: Partial<Record<keyof DrugFormData, string>> = {}
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อยา'
    if (!form.unit.trim()) e.unit = 'กรุณากรอกหน่วย'
    if (isNaN(form.pricePerUnit) || form.pricePerUnit < 0) e.pricePerUnit = 'ราคาต้องเป็นตัวเลข ≥ 0'
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave(form)
  }

  function field(key: keyof DrugFormData) {
    return {
      value: String(form[key] ?? ''),
      onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [key]: key === 'pricePerUnit' ? Number(ev.target.value) : ev.target.value })),
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="รหัสยา" placeholder="เช่น A001" id="code" {...field('code')} />
        <Input label="ชื่อยา *" placeholder="ชื่อสามัญหรือชื่อการค้า" id="name" {...field('name')} error={errors.name} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="ชื่อสามัญ" id="genericName" {...field('genericName')} />
        <Input label="ชื่อการค้า" id="tradeName" {...field('tradeName')} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="ความแรง" placeholder="เช่น 500 mg" id="strength" {...field('strength')} />
        <Input label="รูปแบบยา" placeholder="เช่น เม็ด, แคปซูล" id="dosageForm" {...field('dosageForm')} />
        <Input label="หน่วย *" placeholder="เช่น เม็ด, ml" id="unit" {...field('unit')} error={errors.unit} />
      </div>
      <Input
        label="ราคาต่อหน่วย (บาท)"
        type="number"
        min="0"
        step="0.01"
        id="pricePerUnit"
        {...field('pricePerUnit')}
        error={errors.pricePerUnit}
      />
      <Input label="วิธีใช้ (สำหรับฉลาก)" placeholder="เช่น รับประทาน 1 เม็ด วันละ 3 ครั้ง" id="instruction" {...field('instruction')} />
      <Input label="คำเตือน (สำหรับฉลาก)" placeholder="เช่น ห้ามใช้ในผู้แพ้ยา" id="warning" {...field('warning')} />
      <Input label="หมายเหตุบนฉลาก" id="labelNote" {...field('labelNote')} />

      <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>ยกเลิก</Button>
        <Button onClick={handleSubmit} loading={saving}>บันทึก</Button>
      </div>
    </div>
  )
}

export function DrugListPage() {
  const { user } = useAuthContext()
  const { isAdmin } = useRole(user)
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Drug | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadDrugs() {
    setLoading(true)
    try {
      setDrugs(await getAllDrugs())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDrugs() }, [])

  const filtered = useMemo(() => {
    return drugs.filter(d => {
      if (filterActive === 'active' && !d.active) return false
      if (filterActive === 'inactive' && d.active) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.tradeName.toLowerCase().includes(q) ||
        d.strength.toLowerCase().includes(q) ||
        d.dosageForm.toLowerCase().includes(q)
      )
    })
  }, [drugs, search, filterActive])

  async function handleSave(form: DrugFormData) {
    if (!user) return
    setSaving(true)
    try {
      if (editTarget) {
        await updateDrug(editTarget.id, form, user.uid)
        await writeActivityLog('update_drug', `แก้ไขยา ${form.name}`, user.uid, user.username)
        toast.success('แก้ไขยาสำเร็จ')
      } else {
        await createDrug(form, user.uid)
        await writeActivityLog('create_drug', `เพิ่มยา ${form.name}`, user.uid, user.username)
        toast.success('เพิ่มยาสำเร็จ')
      }
      setModalOpen(false)
      setEditTarget(null)
      await loadDrugs()
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(drug: Drug) {
    if (!user || !isAdmin) return
    if (!confirm(`ยืนยันปิดใช้งานยา "${drug.name}"?`)) return
    try {
      await deactivateDrug(drug.id, user.uid)
      await writeActivityLog('deactivate_drug', `ปิดใช้งานยา ${drug.name}`, user.uid, user.username)
      toast.success('ปิดใช้งานยาสำเร็จ')
      await loadDrugs()
    } catch {
      toast.error('ไม่สำเร็จ')
    }
  }

  async function handleActivate(drug: Drug) {
    if (!user || !isAdmin) return
    try {
      await updateDrug(drug.id, { active: true }, user.uid)
      toast.success('เปิดใช้งานยาสำเร็จ')
      await loadDrugs()
    } catch {
      toast.error('ไม่สำเร็จ')
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">รายการยา</h1>
          <p className="text-sm text-muted mt-0.5">จัดการยาทั้งหมดในระบบ</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditTarget(null); setModalOpen(true) }}>
            <Plus size={16} />
            เพิ่มยา
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full h-10 pl-9 pr-3.5 rounded-md border border-hairline bg-white text-sm focus:outline-none focus:border-ink"
            placeholder="ค้นหาชื่อยา รหัส ความแรง..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-surface-soft rounded-lg p-1 gap-0.5">
          {(['all', 'active', 'inactive'] as const).map(v => (
            <button
              key={v}
              onClick={() => setFilterActive(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterActive === v ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {v === 'all' ? 'ทั้งหมด' : v === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ไม่พบรายการยา"
          description={search ? 'ลองเปลี่ยนคำค้นหา' : 'กดปุ่มเพิ่มยาเพื่อเริ่มต้น'}
        />
      ) : (
        <div className="bg-white border border-hairline rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-soft">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">รหัส</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">ชื่อยา</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">ความแรง / รูปแบบ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">หน่วย</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted">ราคา/หน่วย</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted">สถานะ</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((drug, idx) => (
                <tr key={drug.id} className={`border-b border-hairline last:border-0 ${idx % 2 === 0 ? '' : 'bg-surface-soft/40'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{drug.code || '-'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{drug.name}</p>
                    {drug.genericName && <p className="text-xs text-muted">{drug.genericName}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted">{[drug.strength, drug.dosageForm].filter(Boolean).join(' / ') || '-'}</td>
                  <td className="px-4 py-3 text-muted">{drug.unit}</td>
                  <td className="px-4 py-3 text-right text-muted">
                    {drug.pricePerUnit > 0 ? drug.pricePerUnit.toFixed(2) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={drug.active ? 'success' : 'default'}>
                      {drug.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditTarget(drug); setModalOpen(true) }}
                          className="p-1.5 rounded text-muted hover:text-ink hover:bg-surface-soft transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil size={14} />
                        </button>
                        {drug.active ? (
                          <button
                            onClick={() => handleDeactivate(drug)}
                            className="p-1.5 rounded text-muted hover:text-error hover:bg-red-50 transition-colors"
                            title="ปิดใช้งาน"
                          >
                            <XCircle size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(drug)}
                            className="p-1.5 rounded text-muted hover:text-success hover:bg-green-50 transition-colors"
                            title="เปิดใช้งาน"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        title={editTarget ? 'แก้ไขยา' : 'เพิ่มยาใหม่'}
        size="lg"
      >
        <DrugForm
          initial={editTarget ? {
            code: editTarget.code,
            name: editTarget.name,
            genericName: editTarget.genericName,
            tradeName: editTarget.tradeName,
            strength: editTarget.strength,
            dosageForm: editTarget.dosageForm,
            unit: editTarget.unit,
            pricePerUnit: editTarget.pricePerUnit,
            instruction: editTarget.instruction,
            warning: editTarget.warning,
            labelNote: editTarget.labelNote,
            active: editTarget.active,
          } : emptyForm}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditTarget(null) }}
          saving={saving}
        />
      </Modal>
    </div>
  )
}
