import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Sidebar from './Sidebar'
import { ToastProvider } from '../common/ToastProvider'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Compute sidebar width margin for the main scrollable container
  const mainMarginClass = sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'

  return (
    <ToastProvider>
      {/* 1. Lock root container to exact screen height and hide outer body scrollbars */}
      <div className="flex h-screen w-full overflow-hidden bg-portal-bg">
        
        {/* 2. Sidebar stays fixed on the left (Sidebar component uses md:fixed internally) */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* 3. Right side wrapper holding TopNav and main content */}
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          
          {/* TopNav stays permanently locked at the top */}
          <TopNav 
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)} 
            sidebarCollapsed={sidebarCollapsed} 
          />

          {/* 4. Only this main container handles independent vertical scrolling */}
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