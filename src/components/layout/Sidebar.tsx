import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Pill,
  Building2,
  Plus,
  Settings,
  LogOut,
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
  { to: '/dashboard',         icon: <LayoutDashboard size={17} />, label: 'หน้าหลัก' },
  { to: '/field-units/create', icon: <Plus size={17} />,           label: 'จัดยาออกหน่วย' },
  { to: '/drugs',              icon: <Pill size={17} />,            label: 'รายการยา' },
  { to: '/unit-types',         icon: <Building2 size={17} />,      label: 'ประเภทหน่วย', adminOnly: true },
  { to: '/settings',           icon: <Settings size={17} />,       label: 'ตั้งค่า', adminOnly: true },
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
    <aside className="w-60 h-full bg-surface-soft border-r border-hairline flex flex-col no-print shadow-xl shadow-primary/10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-hairline">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="RxKit"
            className="w-9 h-9 rounded-xl shadow-sm shadow-primary/10"
          />
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">ยาออกหน่วย</p>
            <p className="text-xs leading-tight text-muted">RxKit</p>
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-body hover:bg-surface-card hover:text-ink'
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
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-full bg-white border border-hairline flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-active">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <p className="text-sm font-medium text-ink truncate flex-1">
            {user?.displayName ?? user?.username}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-body hover:bg-surface-card hover:text-error transition-colors"
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
