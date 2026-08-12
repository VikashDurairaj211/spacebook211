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
      {/* 1. Root container uses light sky background to match the nav */}
      <div className="flex h-screen w-full flex-col overflow-hidden bg-sky-50/40">
        
        {/* 2. TopNav stays fixed at the top */}
        <TopNav onToggleSidebar={() => setSidebarCollapsed((v) => !v)} sidebarCollapsed={sidebarCollapsed} />

        {/* 3. Lower section wrapper */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar stays fixed on the left */}
          <Sidebar collapsed={sidebarCollapsed} />

          {/* 4. Main container handles independent scrolling with matching tint */}
          <main className={`flex-1 overflow-y-auto ${mainMarginClass} transition-all duration-200 bg-sky-50/40`}>
            <div className="mx-auto max-w-7xl">
              {/* Optional: If you want content pages to sit on a clean white surface with soft borders */}
              <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-sky-100 p-6 m-6 shadow-sm">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}