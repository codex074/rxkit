import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pill, Building2, ClipboardList, Settings, ArrowRight, Calendar, MapPin, User } from 'lucide-react'
import { listRecentFieldUnits } from '../firebase/firestore'
import { useAuthContext } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { formatThaiDate } from '../utils/date'
import type { FieldUnit } from '../types/fieldUnit'

const statusLabel: Record<string, string> = {
  draft: 'ร่าง',
  saved: 'บันทึกแล้ว',
  printed: 'พิมพ์แล้ว',
  cancelled: 'ยกเลิก',
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'warning',
  saved: 'info',
  printed: 'success',
  cancelled: 'error',
}

export function DashboardPage() {
  const { user } = useAuthContext()
  const { isAdmin } = useRole(user)
  const [records, setRecords] = useState<FieldUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listRecentFieldUnits(10)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">หน้าหลัก</h1>
        <p className="text-sm text-muted mt-1">
          ยินดีต้อนรับ {user?.displayName ?? user?.username}
        </p>
      </div>

      {/* Quick Action */}
      <Link to="/field-units/create" className="block mb-8">
        <div className="bg-primary rounded-xl p-6 text-white flex items-center justify-between hover:bg-primary-active transition-colors">
          <div>
            <p className="text-sm font-medium opacity-80">สร้างรายการใหม่</p>
            <p className="text-xl font-bold mt-0.5">จัดยาออกหน่วย</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Plus size={20} />
            </div>
          </div>
        </div>
      </Link>

      {/* Quick links */}
      {isAdmin && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Link to="/drugs">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-surface-soft rounded-lg flex items-center justify-center">
                  <Pill size={18} className="text-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">รายการยา</p>
                  <p className="text-xs text-muted">จัดการยาทั้งหมด</p>
                </div>
                <ArrowRight size={14} className="text-muted ml-auto" />
              </div>
            </Card>
          </Link>
          <Link to="/unit-types">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-surface-soft rounded-lg flex items-center justify-center">
                  <Building2 size={18} className="text-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">ประเภทหน่วย</p>
                  <p className="text-xs text-muted">จัดการหน่วยออกปฏิบัติ</p>
                </div>
                <ArrowRight size={14} className="text-muted ml-auto" />
              </div>
            </Card>
          </Link>
          <Link to="/default-sets">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-surface-soft rounded-lg flex items-center justify-center">
                  <ClipboardList size={18} className="text-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">ชุดยาเริ่มต้น</p>
                  <p className="text-xs text-muted">กำหนดยาประจำหน่วย</p>
                </div>
                <ArrowRight size={14} className="text-muted ml-auto" />
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Recent Records */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">รายการล่าสุด</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={24} /></div>
        ) : records.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <Settings size={32} className="text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-ink">ยังไม่มีรายการ</p>
              <p className="text-xs text-muted mt-1">กดปุ่ม "จัดยาออกหน่วย" เพื่อสร้างรายการแรก</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map(r => (
              <Link key={r.id} to={`/field-units/${r.id}`}>
                <div className="bg-white border border-hairline rounded-lg px-5 py-4 hover:shadow-sm transition-shadow flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-ink truncate">{r.unitTypeName}</p>
                      <Badge variant={statusVariant[r.status] ?? 'default'}>
                        {statusLabel[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatThaiDate(r.eventDate)}
                      </span>
                      {r.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {r.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {r.responsiblePerson}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted">ปีงบประมาณ</p>
                    <p className="text-sm font-semibold text-ink">{r.fiscalYear}</p>
                  </div>
                  <ArrowRight size={16} className="text-muted flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
