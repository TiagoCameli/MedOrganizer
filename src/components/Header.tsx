'use client'

import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface HeaderProps {
  onToggleSidebar?: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="flex h-14 items-center gap-4 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="text-lg font-semibold bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">
          MedOrganizer
        </h1>
      </div>
    </header>
  )
}
