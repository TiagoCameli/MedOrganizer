'use client'

import { usePomodoroTimer } from './PomodoroProvider'
import { Materia } from '@/types'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'

interface FloatingTimerProps {
  materias: Materia[]
}

export function FloatingTimer({ materias }: FloatingTimerProps) {
  const {
    timerMateriaId, isRunning, isBreak, secondsLeft,
    focusMinutes, breakMinutes, showFlash,
    startTimer, pauseTimer, stopAndLog, resetTimer,
  } = usePomodoroTimer()

  const timerMateria = materias.find(m => m.id === timerMateriaId)

  const isActive = isRunning || isBreak || secondsLeft !== focusMinutes * 60

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <>
      {showFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none animate-pulse bg-indigo-500/20" />
      )}

      {isActive && (
        <div
          className="fixed bottom-4 right-4 z-40 rounded-xl shadow-lg border bg-background p-3 min-w-[200px]"
          style={{ borderLeftWidth: 4, borderLeftColor: isBreak ? '#f59e0b' : timerMateria?.cor || '#6366f1' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: isBreak ? '#f59e0b' : timerMateria?.cor || '#6366f1' }}
            />
            <span className="text-xs font-medium truncate max-w-[120px]">
              {timerMateria?.nome || 'Pomodoro'}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {isRunning ? (isBreak ? 'Intervalo' : 'Focando') : 'Pausado'}
            </span>
          </div>

          <div
            className="text-2xl font-mono font-bold tabular-nums text-center"
            style={{ color: isBreak ? '#f59e0b' : timerMateria?.cor || '#6366f1' }}
          >
            {formatTime(secondsLeft)}
          </div>

          <div className="flex justify-center gap-1.5 mt-2">
            {!isRunning ? (
              <button
                onClick={startTimer}
                className="p-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="p-1.5 rounded-md border hover:bg-muted transition-colors"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            )}
            {!isBreak && (
              <button
                onClick={stopAndLog}
                className="p-1.5 rounded-md border hover:bg-muted transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={resetTimer}
              className="p-1.5 rounded-md border hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
