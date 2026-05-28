import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar />
      <main className="app-main flex-1 overflow-auto h-full">
        <Outlet />
      </main>
    </div>
  )
}
