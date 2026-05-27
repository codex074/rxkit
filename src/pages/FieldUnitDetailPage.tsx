import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Printer, FileText, ArrowLeft, Calendar, MapPin, User, Hash } from 'lucide-react'
import { getFieldUnitById, getFieldUnitItems, updateFieldUnitStatus, writeActivityLog } from '../firebase/firestore'
import { useAuthContext } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { formatThaiDate } from '../utils/date'
import { toast } from 'sonner'
import type { FieldUnit, FieldUnitItem } from '../types/fieldUnit'

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'warning', saved: 'info', printed: 'success', cancelled: 'error',
}
const statusLabel: Record<string, string> = {
  draft: 'ร่าง', saved: 'บันทึกแล้ว', printed: 'พิมพ์แล้ว', cancelled: 'ยกเลิก',
}

export function FieldUnitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [fieldUnit, setFieldUnit] = useState<FieldUnit | null>(null)
  const [items, setItems] = useState<FieldUnitItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getFieldUnitById(id), getFieldUnitItems(id)]).then(([fu, fui]) => {
      setFieldUnit(fu)
      setItems(fui)
      setLoading(false)
    })
  }, [id])

  async function handlePrintChecklist() {
    if (!fieldUnit || !user) return
    await updateFieldUnitStatus(fieldUnit.id, 'printed')
    await writeActivityLog('print_checklist', `พิมพ์ใบตรวจสอบ ${fieldUnit.unitTypeName}`, user.uid, user.username)
    toast.success('เปิดหน้าพิมพ์ใบตรวจสอบ')
    navigate(`/field-units/${id}/print-checklist`)
  }

  async function handlePrintLabels() {
    if (!fieldUnit || !user) return
    await updateFieldUnitStatus(fieldUnit.id, 'printed')
    await writeActivityLog('print_labels', `พิมพ์ฉลากยา ${fieldUnit.unitTypeName}`, user.uid, user.username)
    toast.success('เปิดหน้าพิมพ์ฉลาก')
    navigate(`/field-units/${id}/print-labels`)
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={24} /></div>
  if (!fieldUnit) return <div className="p-8 text-muted text-sm">ไม่พบรายการ</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-6 w-fit">
        <ArrowLeft size={14} />
        กลับหน้าหลัก
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-ink">{fieldUnit.unitTypeName}</h1>
            <Badge variant={statusVariant[fieldUnit.status] ?? 'default'}>
              {statusLabel[fieldUnit.status] ?? fieldUnit.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatThaiDate(fieldUnit.eventDate)}
            </span>
            {fieldUnit.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {fieldUnit.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <User size={14} />
              {fieldUnit.responsiblePerson}
            </span>
            <span className="flex items-center gap-1.5">
              <Hash size={14} />
              ปีงบประมาณ {fieldUnit.fiscalYear}
            </span>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="secondary" onClick={handlePrintChecklist}>
            <FileText size={16} />
            พิมพ์ใบตรวจสอบ
          </Button>
          <Button onClick={handlePrintLabels}>
            <Printer size={16} />
            พิมพ์ฉลากยา
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-xs text-muted mb-0.5">จำนวนชุด</p>
          <p className="text-2xl font-bold text-ink">{fieldUnit.numberOfSets}</p>
          <p className="text-xs text-muted">ชุด</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-0.5">จำนวนรายการยา</p>
          <p className="text-2xl font-bold text-ink">{items.length}</p>
          <p className="text-xs text-muted">รายการ</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-0.5">สร้างโดย</p>
          <p className="text-sm font-semibold text-ink">{fieldUnit.createdByName}</p>
          <p className="text-xs text-muted">{formatThaiDate(fieldUnit.createdAt)}</p>
        </Card>
      </div>

      {fieldUnit.note && (
        <Card className="mb-6">
          <p className="text-xs text-muted mb-1">หมายเหตุ</p>
          <p className="text-sm text-ink">{fieldUnit.note}</p>
        </Card>
      )}

      {/* Items table */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-3">รายการยา</h2>
        <div className="bg-white border border-hairline rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-soft">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted w-8">ลำดับ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">ชื่อยา</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">ความแรง / รูปแบบ</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted">จำนวน/ชุด</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted">จำนวนรวม</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">หน่วย</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-hairline last:border-0 ${idx % 2 === 0 ? '' : 'bg-surface-soft/30'}`}>
                  <td className="px-4 py-3 text-center text-muted">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{item.drugNameSnapshot}</p>
                    {item.genericNameSnapshot && <p className="text-xs text-muted">{item.genericNameSnapshot}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[item.strengthSnapshot, item.dosageFormSnapshot].filter(Boolean).join(' / ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">{item.qtyPerSet}</td>
                  <td className="px-4 py-3 text-center font-semibold text-ink">{item.totalQty}</td>
                  <td className="px-4 py-3 text-muted">{item.unitSnapshot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
