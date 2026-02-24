'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface PomodoroContextType {
  timerMateriaId: string
  setTimerMateriaId: (id: string) => void
  timerConteudoId: string
  setTimerConteudoId: (id: string) => void
  focusMinutes: number
  setFocusMinutes: (min: number) => void
  breakMinutes: number
  setBreakMinutes: (min: number) => void
  isRunning: boolean
  isBreak: boolean
  secondsLeft: number
  alarmType: 'som' | 'visual' | 'ambos'
  setAlarmType: (type: 'som' | 'visual' | 'ambos') => void
  showFlash: boolean
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  stopAndLog: () => void
  startBreakEarly: () => void
}

const PomodoroContext = createContext<PomodoroContextType | null>(null)

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [timerMateriaId, setTimerMateriaIdRaw] = useState('')
  const [timerConteudoId, setTimerConteudoId] = useState('')
  const setTimerMateriaId = useCallback((id: string) => {
    setTimerMateriaIdRaw(id)
    setTimerConteudoId('')
  }, [])
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [alarmType, setAlarmType] = useState<'som' | 'visual' | 'ambos'>('som')
  const [showFlash, setShowFlash] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const targetEndRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevFocusMinutesRef = useRef(focusMinutes)

  const supabase = createClient()

  const logSession = useCallback(async (materiaId: string, durationMin: number, conteudoId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('study_sessions')
        .insert({
          materia_id: materiaId,
          duration_minutes: durationMin,
          studied_at: format(new Date(), 'yyyy-MM-dd'),
          user_id: user.id,
          conteudo_id: conteudoId || null,
        })
      toast.success(`Sessão de ${durationMin} min registrada!`)
      window.dispatchEvent(new Event('pomodoroSessionAdded'))
    } catch {
      toast.error('Erro ao registrar sessão')
    }
  }, [supabase])

  const triggerAlarm = useCallback(() => {
    if (alarmType === 'som' || alarmType === 'ambos') {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.3
      osc.start()
      osc.stop(ctx.currentTime + 3)
    }
    if (alarmType === 'visual' || alarmType === 'ambos') {
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 2000)
    }
  }, [alarmType])

  const startTimer = useCallback(() => {
    if (!timerMateriaId) {
      toast.error('Selecione uma matéria antes de iniciar')
      return
    }
    const nowMs = Date.now()
    startTimeRef.current = startTimeRef.current || nowMs
    targetEndRef.current = nowMs + secondsLeft * 1000
    setIsRunning(true)
  }, [timerMateriaId, secondsLeft])

  const pauseTimer = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setIsBreak(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setSecondsLeft(focusMinutes * 60)
    startTimeRef.current = null
    targetEndRef.current = null
  }, [focusMinutes])

  // Timer tick
  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round((targetEndRef.current! - Date.now()) / 1000)
      )
      setSecondsLeft(remaining)

      if (remaining <= 0) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setIsRunning(false)

        if (!isBreak) {
          const durationMs = Date.now() - startTimeRef.current!
          const durationMin = Math.round(durationMs / 60000)
          if (durationMin > 0 && timerMateriaId) {
            logSession(timerMateriaId, durationMin, timerConteudoId)
          }
          triggerAlarm()
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro concluído!', { body: 'Hora do intervalo.' })
          }
          setIsBreak(true)
          const breakSecs = breakMinutes * 60
          setSecondsLeft(breakSecs)
          startTimeRef.current = Date.now()
          targetEndRef.current = Date.now() + breakSecs * 1000
          setIsRunning(true)
        } else {
          triggerAlarm()
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Intervalo terminado!', { body: 'Volta a estudar!' })
          }
          setIsBreak(false)
          setSecondsLeft(focusMinutes * 60)
          startTimeRef.current = null
          targetEndRef.current = null
        }
      }
    }, 250)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isBreak, focusMinutes, breakMinutes, timerMateriaId, timerConteudoId, logSession, triggerAlarm])

  const stopAndLog = useCallback(() => {
    if (startTimeRef.current && timerMateriaId && !isBreak) {
      const durationMs = Date.now() - startTimeRef.current
      const durationMin = Math.round(durationMs / 60000)
      if (durationMin > 0) {
        logSession(timerMateriaId, durationMin, timerConteudoId)
      } else {
        toast.info('Sessão muito curta para registrar')
      }
    }
    resetTimer()
  }, [timerMateriaId, timerConteudoId, isBreak, logSession, resetTimer])

  const startBreakEarly = useCallback(() => {
    if (startTimeRef.current && timerMateriaId) {
      const durationMs = Date.now() - startTimeRef.current
      const durationMin = Math.round(durationMs / 60000)
      if (durationMin > 0) {
        logSession(timerMateriaId, durationMin, timerConteudoId)
      }
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
    setIsBreak(true)
    const breakSecs = breakMinutes * 60
    setSecondsLeft(breakSecs)
    startTimeRef.current = Date.now()
    targetEndRef.current = Date.now() + breakSecs * 1000
    setIsRunning(true)
  }, [timerMateriaId, timerConteudoId, breakMinutes, logSession])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Update secondsLeft only when focusMinutes actually changes (not on pause)
  useEffect(() => {
    if (focusMinutes !== prevFocusMinutesRef.current) {
      prevFocusMinutesRef.current = focusMinutes
      if (!isRunning && !isBreak) {
        setSecondsLeft(focusMinutes * 60)
      }
    }
  }, [focusMinutes, isRunning, isBreak])

  return (
    <PomodoroContext.Provider value={{
      timerMateriaId, setTimerMateriaId,
      timerConteudoId, setTimerConteudoId,
      focusMinutes, setFocusMinutes,
      breakMinutes, setBreakMinutes,
      isRunning, isBreak, secondsLeft,
      alarmType, setAlarmType, showFlash,
      startTimer, pauseTimer, resetTimer, stopAndLog, startBreakEarly,
    }}>
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoroTimer() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoroTimer must be used within PomodoroProvider')
  return ctx
}
