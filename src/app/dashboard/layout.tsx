'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { PomodoroProvider } from '@/components/PomodoroProvider'
import { FloatingTimer } from '@/components/FloatingTimer'
import { useMaterias } from '@/hooks/useMaterias'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { materias } = useMaterias()

  return (
    <PomodoroProvider>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-h-screen">
            <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
        <FloatingTimer materias={materias} />
      </div>
    </PomodoroProvider>
  )
}
