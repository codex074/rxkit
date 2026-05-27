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
    <aside className="w-60 h-full bg-sidebar flex flex-col no-print">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
            <Pill size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">ยาออกหน่วย</p>
            <p className="text-xs leading-tight" style={{ color: '#475569' }}>RxKit</p>
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
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-sidebar-text hover:bg-sidebar-elevated hover:text-white'
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
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary" style={{ color: '#93c5fd' }}>
              {user?.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <p className="text-sm font-medium text-white truncate flex-1">
            {user?.displayName ?? user?.username}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-text hover:bg-sidebar-elevated hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
