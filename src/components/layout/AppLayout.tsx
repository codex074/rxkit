import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthContext } from '../../context/AuthContext'
import { useIdleLogout } from '../../hooks/useIdleLogout'

export function AppLayout() {
  const { user } = useAuthContext()
  useIdleLogout(!!user)

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar />
      <main className="app-main flex-1 overflow-auto h-full">
        <Outlet />
      </main>
    </div>
  )
}
