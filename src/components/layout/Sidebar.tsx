import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Pill,
  Building2,
  ClipboardList,
  Plus,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { logout } from '../../firebase/auth'
import { useAuthContext } from '../../context/AuthContext'
import { useRole } from '../../hooks/useRole'
import { toast } from 'sonner'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'หน้าหลัก' },
  { to: '/field-units/create', icon: <Plus size={18} />, label: 'จัดยาออกหน่วย' },
  { to: '/drugs', icon: <Pill size={18} />, label: 'รายการยา' },
  { to: '/unit-types', icon: <Building2 size={18} />, label: 'ประเภทหน่วย', adminOnly: true },
  { to: '/default-sets', icon: <ClipboardList size={18} />, label: 'ชุดยาเริ่มต้น', adminOnly: true },
  { to: '/settings', icon: <Settings size={18} />, label: 'ตั้งค่า', adminOnly: true },
]

export function Sidebar() {
  const { user } = useAuthContext()
  const { isAdmin } = useRole(user)
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      navigate('/login')
    } catch {
      toast.error('ออกจากระบบไม่สำเร็จ')
    }
  }

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-hairline flex flex-col no-print">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-hairline">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Pill size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">ยาออกหน่วย</p>
            <p className="text-xs text-muted-soft leading-tight">RxKit</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-card text-ink'
                    : 'text-muted hover:bg-surface-soft hover:text-ink'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-hairline">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-soft cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-surface-strong flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-muted">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{user?.displayName ?? user?.username}</p>
            <p className="text-xs text-muted capitalize">{user?.role}</p>
          </div>
          <ChevronRight size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-md text-sm text-muted hover:bg-surface-soft hover:text-error transition-colors"
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
