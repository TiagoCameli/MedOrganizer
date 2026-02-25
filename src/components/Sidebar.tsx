'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useTheme, COLOR_THEMES } from '@/components/ThemeProvider'
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
  Palette,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
  const { theme, colorTheme, toggleTheme, setColorTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
          <span className="font-semibold text-emerald-600">MedOrganizer</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden lg:flex h-12 items-center border-b px-3">
          <span className="font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent text-base">
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
                    ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-950 dark:text-emerald-300'
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
              {mounted && theme === 'dark' ? (
                <Sun className="h-3 w-3" />
              ) : (
                <Moon className="h-3 w-3" />
              )}
            </Button>
            {mounted && <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Palette className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-2" side="top" align="start">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Tema</p>
                <div className="space-y-0.5">
                  {COLOR_THEMES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setColorTheme(ct.value)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                        colorTheme === ct.value
                          ? 'bg-muted font-medium'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div
                        className="h-4 w-4 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: ct.color }}
                      />
                      <span className="flex-1 text-left">{ct.label}</span>
                      {colorTheme === ct.value && (
                        <Check className="h-3 w-3 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
