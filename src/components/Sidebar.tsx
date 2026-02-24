'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/components/ThemeProvider'
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  GraduationCap,
  BookOpen,
  Brain,
  X,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard/horarios', label: 'Acadêmico', icon: Clock },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/notas', label: 'Notas', icon: GraduationCap },
  { href: '/dashboard/materias', label: 'Matérias', icon: BookOpen },
  { href: '/dashboard/flashcards', label: 'Flashcards', icon: Brain },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-40 border-r bg-background transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <span className="font-semibold text-indigo-600">MedOrganizer</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden lg:flex h-12 items-center border-b px-3">
          <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-base">
            MedOrganizer
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-950 dark:text-indigo-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + actions at bottom */}
        <div className="border-t p-2 space-y-1">
          {user && (
            <p className="text-[10px] text-muted-foreground truncate px-1">
              {user.email}
            </p>
          )}
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <Sun className="h-3 w-3" />
              ) : (
                <Moon className="h-3 w-3" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
