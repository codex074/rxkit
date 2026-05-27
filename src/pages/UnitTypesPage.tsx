import { useState, useEffect } from 'react'
import { Plus, Pencil, XCircle, CheckCircle } from 'lucide-react'
import { getAllUnitTypes, createUnitType, updateUnitType, writeActivityLog } from '../firebase/firestore'
import { useAuthContext } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { toast } from 'sonner'
import type { UnitType, UnitTypeFormData } from '../types/unit'

const emptyForm: UnitTypeFormData = { name: '', description: '', active: true, sortOrder: 0 }

function UnitTypeForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: UnitTypeFormData
  onSave: (d: UnitTypeFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<UnitTypeFormData>(initial)
  const [nameError, setNameError] = useState('')

  function handleSubmit() {
    if (!form.name.trim()) { setNameError('กรุณากรอกชื่อประเภทหน่วย'); return }
    onSave(form)
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="ชื่อประเภทหน่วย *"
        placeholder="เช่น ปฐมพยาบาล"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        error={nameError}
      />
      <Input
        label="คำอธิบาย"
        placeholder="รายละเอียดเพิ่มเติม"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
      />
      <Input
        label="ลำดับการแสดง"
        type="number"
        min="0"
        value={String(form.sortOrder)}
        onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
      />
      <div className="flex justify-end gap-3 pt-2 border-t border-hairline">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>ยกเลิก</Button>
        <Button onClick={handleSubmit} loading={saving}>บันทึก</Button>
      </div>
    </div>
  )
}

export function UnitTypesPage() {
  const { user } = useAuthContext()
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UnitType | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try { setUnitTypes(await getAllUnitTypes()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleSave(form: UnitTypeFormData) {
    if (!user) return
    setSaving(true)
    try {
      if (editTarget) {
        await updateUnitType(editTarget.id, form, user.uid)
        await writeActivityLog('update_unit_type', `แก้ไขประเภทหน่วย ${form.name}`, user.uid, user.username)
        toast.success('แก้ไขสำเร็จ')
      } else {
        await createUnitType(form, user.uid)
        await writeActivityLog('create_unit_type', `เพิ่มประเภทหน่วย ${form.name}`, user.uid, user.username)
        toast.success('เพิ่มสำเร็จ')
      }
      setModalOpen(false)
      setEditTarget(null)
      await load()
    } catch { toast.error('บันทึกไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function toggleActive(ut: UnitType) {
    if (!user) return
    try {
      await updateUnitType(ut.id, { active: !ut.active }, user.uid)
      toast.success(ut.active ? 'ปิดใช้งานแล้ว' : 'เปิดใช้งานแล้ว')
      await load()
    } catch { toast.error('ไม่สำเร็จ') }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">ประเภทหน่วย</h1>
          <p className="text-sm text-muted mt-0.5">จัดการประเภทหน่วยออกปฏิบัติ</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true) }}>
          <Plus size={16} />
          เพิ่มประเภทหน่วย
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : (
        <div className="bg-white border border-hairline rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-soft">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">ลำดับ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">ชื่อประเภทหน่วย</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">คำอธิบาย</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted">สถานะ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {unitTypes.map(ut => (
                <tr key={ut.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-muted text-center w-16">{ut.sortOrder}</td>
                  <td className="px-4 py-3 font-medium text-ink">{ut.name}</td>
                  <td className="px-4 py-3 text-muted">{ut.description || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={ut.active ? 'success' : 'default'}>
                      {ut.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditTarget(ut); setModalOpen(true) }}
                        className="p-1.5 rounded text-muted hover:text-ink hover:bg-surface-soft transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(ut)}
                        className={`p-1.5 rounded transition-colors ${
                          ut.active
                            ? 'text-muted hover:text-error hover:bg-red-50'
                            : 'text-muted hover:text-success hover:bg-green-50'
                        }`}
                      >
                        {ut.active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        title={editTarget ? 'แก้ไขประเภทหน่วย' : 'เพิ่มประเภทหน่วย'}
      >
        <UnitTypeForm
          initial={editTarget ? {
            name: editTarget.name,
            description: editTarget.description,
            active: editTarget.active,
            sortOrder: editTarget.sortOrder,
          } : emptyForm}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditTarget(null) }}
          saving={saving}
        />
      </Modal>
    </div>
  )
}
