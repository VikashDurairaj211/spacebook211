import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Sidebar from './Sidebar'
import { ToastProvider } from '../common/ToastProvider'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // compute sidebar width classes for main margin
  const mainMarginClass = sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'

  return (
    <ToastProvider>
      {/* 1. Lock root container height to exact screen viewport and hide window scrolling */}
      <div className="flex h-screen w-full flex-col overflow-hidden bg-portal-bg">
        
        {/* 2. TopNav stays fixed at the top */}
        <TopNav onToggleSidebar={() => setSidebarCollapsed((v) => !v)} sidebarCollapsed={sidebarCollapsed} />

        {/* 3. Lower section wrapper */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar stays fixed on the left */}
          <Sidebar collapsed={sidebarCollapsed} />

          {/* 4. Only this main container handles independent scrolling */}
          <main className={`flex-1 overflow-y-auto ${mainMarginClass} transition-all duration-200 bg-portal-bg`}>
            <div className="mx-auto max-w-7xl">
              <div className="rounded-[24px] bg-white p-6 m-6 shadow-md">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}