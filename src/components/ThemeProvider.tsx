'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Mode = 'light' | 'dark'
type ColorTheme = 'padrao' | 'oceano' | 'floresta' | 'rose' | 'lavanda'

const ThemeContext = createContext<{
  theme: Mode
  colorTheme: ColorTheme
  toggleTheme: () => void
  setColorTheme: (theme: ColorTheme) => void
}>({
  theme: 'light',
  colorTheme: 'padrao',
  toggleTheme: () => {},
  setColorTheme: () => {},
})

export const COLOR_THEMES: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'padrao', label: 'Padrão', color: '#059669' },
  { value: 'oceano', label: 'Oceano', color: '#3b82f6' },
  { value: 'floresta', label: 'Floresta', color: '#22c55e' },
  { value: 'rose', label: 'Rosé', color: '#f43f5e' },
  { value: 'lavanda', label: 'Lavanda', color: '#a855f7' },
]

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Mode>('light')
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('padrao')

  useEffect(() => {
    const storedMode = localStorage.getItem('theme') as Mode | null
    const storedColor = localStorage.getItem('colorTheme') as ColorTheme | null

    if (storedMode) {
      setTheme(storedMode)
      document.documentElement.classList.toggle('dark', storedMode === 'dark')
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
      document.documentElement.classList.add('dark')
    }

    if (storedColor) {
      setColorThemeState(storedColor)
      if (storedColor === 'padrao') {
        document.documentElement.removeAttribute('data-color-theme')
      } else {
        document.documentElement.setAttribute('data-color-theme', storedColor)
      }
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const setColorTheme = (ct: ColorTheme) => {
    setColorThemeState(ct)
    localStorage.setItem('colorTheme', ct)
    if (ct === 'padrao') {
      document.documentElement.removeAttribute('data-color-theme')
    } else {
      document.documentElement.setAttribute('data-color-theme', ct)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, toggleTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
