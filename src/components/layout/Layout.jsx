import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // compute sidebar width classes for main margin
  const mainMarginClass = sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'

  return (
    <div className="min-h-screen bg-portal-bg">
      <TopNav onToggleSidebar={() => setSidebarCollapsed((v) => !v)} sidebarCollapsed={sidebarCollapsed} />

      <div className="pt-14">
        <Sidebar collapsed={sidebarCollapsed} />

        <main className={`${mainMarginClass} min-h-[calc(100vh-3.5rem)] overflow-y-auto bg-portal-bg`}> 
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[24px] bg-white p-6 m-6 shadow-md">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
