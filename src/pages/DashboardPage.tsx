import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pill, Building2, Settings, ArrowRight, Calendar, MapPin, User, Sparkles, Filter } from 'lucide-react'
import { listFieldUnitFiscalYears, listFieldUnitsByFiscalYear } from '../firebase/firestore'
import { useAuthContext } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { formatThaiDate } from '../utils/date'
import { getCurrentThaiFiscalYear } from '../utils/fiscalYear'
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

const unitTypeColors: Record<string, string> = {
  'ปฐมพยาบาล': 'bg-emerald-500',
  'รับเสด็จ':   'bg-indigo-500',
  'น้ำท่วม':    'bg-sky-500',
  'พอ.สว.':     'bg-orange-500',
  'อื่นๆ':      'bg-rose-400',
}

function unitColor(name: string) {
  return unitTypeColors[name] ?? 'bg-primary'
}

export function DashboardPage() {
  const { user } = useAuthContext()
  const { isAdmin } = useRole(user)
  const [records, setRecords] = useState<FieldUnit[]>([])
  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(getCurrentThaiFiscalYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listFieldUnitFiscalYears()
      .then(setFiscalYears)
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    listFieldUnitsByFiscalYear(selectedFiscalYear, 10)
      .then(setRecords)
      .catch(error => {
        console.error(error)
        setRecords([])
      })
      .finally(() => setLoading(false))
  }, [selectedFiscalYear])

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">หน้าหลัก</h1>
        <p className="text-sm text-muted mt-1">
          ยินดีต้อนรับ, <span className="font-medium text-ink">{user?.displayName ?? user?.username}</span>
        </p>
      </div>

      {/* Quick Action banner */}
      <Link to="/field-units/create" className="block mb-8">
        <div className="relative overflow-hidden rounded-2xl px-7 py-6 flex items-center justify-between border border-primary/10 shadow-sm shadow-primary/10"
          style={{ background: 'linear-gradient(135deg, #0f766e 0%, #2563eb 64%, #f59e0b 128%)' }}>
          <div className="relative">
            <p className="text-sm font-medium text-teal-50 mb-0.5">สร้างรายการใหม่</p>
            <p className="text-2xl font-bold text-white">จัดยาออกหน่วย</p>
          </div>
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 border border-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Plus size={24} className="text-white" />
            </div>
          </div>
        </div>
      </Link>

      {/* Quick links */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link to="/drugs">
            <div className="bg-white border border-hairline rounded-xl p-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group flex items-center gap-4">
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Pill size={20} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">รายการยา</p>
                <p className="text-xs text-muted">จัดการยาทั้งหมด</p>
              </div>
              <ArrowRight size={16} className="text-muted group-hover:text-ink transition-colors" />
            </div>
          </Link>
          <Link to="/unit-types">
            <div className="bg-white border border-hairline rounded-xl p-4 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group flex items-center gap-4">
              <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                <Building2 size={20} className="text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">ประเภทหน่วย</p>
                <p className="text-xs text-muted">จัดการหน่วย + ชุดยา</p>
              </div>
              <ArrowRight size={16} className="text-muted group-hover:text-ink transition-colors" />
            </div>
          </Link>
        </div>
      )}

      {/* Recent Records */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-ink">รายการล่าสุด</h2>
            <span className="text-xs text-muted">ปีงบประมาณ {selectedFiscalYear}</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <Filter size={14} />
            <span>ปีงบประมาณ</span>
            <select
              value={String(selectedFiscalYear)}
              onChange={e => setSelectedFiscalYear(Number(e.target.value))}
              className="h-9 rounded-md border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            >
              {!fiscalYears.includes(selectedFiscalYear) && (
                <option value={selectedFiscalYear} disabled>
                  {selectedFiscalYear} (ยังไม่มีข้อมูล)
                </option>
              )}
              {fiscalYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={24} /></div>
        ) : records.length === 0 ? (
          <div className="bg-white border border-hairline rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-surface-soft rounded-xl flex items-center justify-center mx-auto mb-3">
              <Settings size={22} className="text-muted" />
            </div>
            <p className="text-sm font-medium text-ink">ยังไม่มีรายการในปีงบประมาณ {selectedFiscalYear}</p>
            <p className="text-xs text-muted mt-1">กดปุ่ม "จัดยาออกหน่วย" เพื่อสร้างรายการ หรือเลือกปีงบประมาณอื่น</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map(r => (
              <Link key={r.id} to={`/field-units/${r.id}`}>
                <div className="bg-white border border-hairline rounded-xl px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all flex items-center gap-4 group">
                  {/* color dot */}
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${unitColor(r.unitTypeName)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-ink truncate">{r.unitTypeName}</p>
                      {r.status !== 'printed' && (
                        <Badge variant={statusVariant[r.status] ?? 'default'}>
                          {statusLabel[r.status] ?? r.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatThaiDate(r.eventDate)}
                      </span>
                      {r.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {r.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {r.responsiblePerson}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted">ปีงบประมาณ</p>
                    <p className="text-sm font-bold text-ink">{r.fiscalYear}</p>
                  </div>
                  <ArrowRight size={15} className="text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
