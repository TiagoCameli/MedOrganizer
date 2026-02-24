'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useStudySessions } from '@/hooks/useStudySessions'
import { usePomodoroTimer } from '@/components/PomodoroProvider'
import { useConteudos } from '@/hooks/useConteudos'
import { Materia, StudyGoal } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Play, Pause, Square, RotateCcw, Target, Clock, Flame, BookOpen, Plus, Trash2, Loader2, Filter, Coffee, List
} from 'lucide-react'
import { toast } from 'sonner'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval, eachWeekOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function GoalsList({ goals, hoursMap, materias, onDelete, emptyMessage }: {
  goals: StudyGoal[]
  hoursMap: Record<string, number>
  materias: Materia[]
  onDelete: (id: string) => void
  emptyMessage: string
}) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {goals.map(goal => {
        const mat = materias.find(m => m.id === goal.materia_id)
        if (!mat) return null
        const actual = hoursMap[goal.materia_id] || 0
        const pct = Math.min(100, (actual / goal.horas_meta) * 100)
        const completed = actual >= goal.horas_meta

        return (
          <div key={goal.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mat.cor }} />
                <span className="text-sm font-medium">{mat.nome}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${completed ? 'text-green-600' : ''}`}>
                  {actual.toFixed(1)}h / {goal.horas_meta}h
                </span>
                <button
                  onClick={() => onDelete(goal.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: completed ? '#22c55e' : mat.cor,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface GradeEstudoProps {
  materias: Materia[]
  semestreAtual?: number | null
}

export function GradeEstudo({ materias, semestreAtual }: GradeEstudoProps) {
  const {
    sessions, goals, loading,
    fetchSessions, deleteSession,
    upsertGoal, deleteGoal
  } = useStudySessions()

  const {
    timerMateriaId, setTimerMateriaId,
    timerConteudoId, setTimerConteudoId,
    focusMinutes, setFocusMinutes,
    breakMinutes, setBreakMinutes,
    isRunning, isBreak, secondsLeft,
    alarmType, setAlarmType,
    startTimer, pauseTimer, resetTimer, stopAndLog, startBreakEarly,
  } = usePomodoroTimer()

  const { conteudos: timerConteudos, fetchConteudos: fetchTimerConteudos } = useConteudos()

  // Fetch conteudos when timer materia changes
  useEffect(() => {
    if (timerMateriaId) {
      fetchTimerConteudos(timerMateriaId)
    }
  }, [timerMateriaId, fetchTimerConteudos])

  // --- Semester filter ---
  const semestresDisponiveis = useMemo(() => {
    const set = new Set<number>()
    for (const m of materias) {
      if (m.semestre != null) set.add(m.semestre)
    }
    return [...set].sort((a, b) => a - b)
  }, [materias])

  const [selectedSemestre, setSelectedSemestre] = useState<number | null>(null)

  // Auto-select current semester (or first available) on load
  useEffect(() => {
    if (selectedSemestre === null && semestresDisponiveis.length > 0) {
      if (semestreAtual && semestresDisponiveis.includes(semestreAtual)) {
        setSelectedSemestre(semestreAtual)
      } else {
        setSelectedSemestre(semestresDisponiveis[0])
      }
    }
  }, [semestresDisponiveis, selectedSemestre, semestreAtual])

  // Materias filtered by selected semester
  const materiasFiltradas = useMemo(() => {
    if (selectedSemestre === null) return materias
    return materias.filter(m => m.semestre === selectedSemestre)
  }, [materias, selectedSemestre])

  const materiaIdsFiltradas = useMemo(() => new Set(materiasFiltradas.map(m => m.id)), [materiasFiltradas])

  // Sessions filtered by semester
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => materiaIdsFiltradas.has(s.materia_id))
  }, [sessions, materiaIdsFiltradas])

  // --- Chart period toggle ---
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week')

  // --- Date range calculation ---
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const weekEnd = useMemo(() => endOfWeek(new Date(), { weekStartsOn: 1 }), [])
  const monthStart = useMemo(() => startOfMonth(new Date()), [])
  const monthEnd = useMemo(() => endOfMonth(new Date()), [])

  // Always fetch full month so we have data for both weekly and monthly goals
  const monthStartStr = useMemo(() => format(monthStart, 'yyyy-MM-dd'), [monthStart])
  const monthEndStr = useMemo(() => format(monthEnd, 'yyyy-MM-dd'), [monthEnd])

  const refetchSessions = useCallback(() => {
    fetchSessions(monthStartStr, monthEndStr)
  }, [fetchSessions, monthStartStr, monthEndStr])

  useEffect(() => {
    refetchSessions()
  }, [refetchSessions])

  // Listen for session additions from PomodoroProvider
  useEffect(() => {
    const handler = () => refetchSessions()
    window.addEventListener('pomodoroSessionAdded', handler)
    return () => window.removeEventListener('pomodoroSessionAdded', handler)
  }, [refetchSessions])

  // Clear timer materia when semester changes and current selection is no longer valid
  useEffect(() => {
    if (timerMateriaId && !materiaIdsFiltradas.has(timerMateriaId) && !isRunning) {
      setTimerMateriaId('')
    }
  }, [materiaIdsFiltradas, timerMateriaId, isRunning, setTimerMateriaId])

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const timerMateria = materias.find(m => m.id === timerMateriaId)

  // ========================================
  // Summary computations
  // ========================================
  const weekStartStr = useMemo(() => format(weekStart, 'yyyy-MM-dd'), [weekStart])
  const weekEndStr = useMemo(() => format(weekEnd, 'yyyy-MM-dd'), [weekEnd])

  const weeklyFilteredSessions = useMemo(() => {
    return filteredSessions.filter(s => s.studied_at >= weekStartStr && s.studied_at <= weekEndStr)
  }, [filteredSessions, weekStartStr, weekEndStr])

  const totalHoursThisWeek = useMemo(() => {
    return weeklyFilteredSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60
  }, [weeklyFilteredSessions])

  const sessionsToday = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return filteredSessions.filter(s => s.studied_at === todayStr).length
  }, [filteredSessions])

  const currentStreak = useMemo(() => {
    const sessionDates = new Set(filteredSessions.map(s => s.studied_at))
    let streak = 0
    const checkDate = new Date()
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd')
      if (sessionDates.has(dateStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [filteredSessions])

  // ========================================
  // Chart data
  // ========================================
  const materiasWithSessions = useMemo(() => {
    return materiasFiltradas.filter(m => filteredSessions.some(s => s.materia_id === m.id))
  }, [materiasFiltradas, filteredSessions])

  const chartData = useMemo(() => {
    if (chartPeriod === 'week') {
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
      return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayLabel = format(day, 'EEE', { locale: ptBR })
        const entry: Record<string, string | number> = { day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1) }

        for (const mat of materiasWithSessions) {
          const totalMin = filteredSessions
            .filter(s => s.studied_at === dateStr && s.materia_id === mat.id)
            .reduce((sum, s) => sum + s.duration_minutes, 0)
          entry[mat.nome] = +(totalMin / 60).toFixed(1)
        }
        return entry
      })
    } else {
      const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 })
      return weeks.map((weekStartDate, i) => {
        const wEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 })
        const entry: Record<string, string | number> = {
          day: `Sem ${i + 1} (${format(weekStartDate, 'dd/MM')})`
        }

        for (const mat of materiasWithSessions) {
          const totalMin = filteredSessions
            .filter(s => {
              const d = s.studied_at
              return d >= format(weekStartDate, 'yyyy-MM-dd') &&
                     d <= format(wEnd, 'yyyy-MM-dd') &&
                     s.materia_id === mat.id
            })
            .reduce((sum, s) => sum + s.duration_minutes, 0)
          entry[mat.nome] = +(totalMin / 60).toFixed(1)
        }
        return entry
      })
    }
  }, [filteredSessions, materiasWithSessions, chartPeriod, weekStart, weekEnd, monthStart, monthEnd])

  // ========================================
  // Goals
  // ========================================
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalMateriaId, setGoalMateriaId] = useState('')
  const [goalHoras, setGoalHoras] = useState('5')
  const [goalTipo, setGoalTipo] = useState<'semanal' | 'mensal'>('semanal')
  const [savingGoal, setSavingGoal] = useState(false)
  const [activeGoalTab, setActiveGoalTab] = useState<'semanal' | 'mensal'>('semanal')

  const handleSaveGoal = async () => {
    if (!goalMateriaId) { toast.error('Selecione uma matéria'); return }
    const horas = parseFloat(goalHoras)
    if (!horas || horas <= 0) { toast.error('Informe uma meta válida'); return }

    setSavingGoal(true)
    try {
      await upsertGoal(goalMateriaId, horas, goalTipo)
      setGoalDialogOpen(false)
      setGoalMateriaId('')
      setGoalHoras(goalTipo === 'semanal' ? '5' : '20')
      toast.success('Meta salva!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSavingGoal(false)
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return
    try {
      await deleteGoal(id)
      toast.success('Meta excluída!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  // Hours studied per materia — weekly
  const weeklyHoursPerMateria = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of weeklyFilteredSessions) {
      map[s.materia_id] = (map[s.materia_id] || 0) + s.duration_minutes / 60
    }
    return map
  }, [weeklyFilteredSessions])

  // Hours studied per materia — monthly (full month)
  const monthlyHoursPerMateria = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of filteredSessions) {
      map[s.materia_id] = (map[s.materia_id] || 0) + s.duration_minutes / 60
    }
    return map
  }, [filteredSessions])

  // Goals filtered by semester + tipo
  const weeklyGoals = useMemo(() => {
    return goals.filter(g => materiaIdsFiltradas.has(g.materia_id) && g.tipo === 'semanal')
  }, [goals, materiaIdsFiltradas])

  const monthlyGoals = useMemo(() => {
    return goals.filter(g => materiaIdsFiltradas.has(g.materia_id) && g.tipo === 'mensal')
  }, [goals, materiaIdsFiltradas])

  // Materias that don't have a goal yet for each tipo
  const materiasWithoutWeeklyGoal = useMemo(() => {
    const ids = new Set(weeklyGoals.map(g => g.materia_id))
    return materiasFiltradas.filter(m => !ids.has(m.id))
  }, [materiasFiltradas, weeklyGoals])

  const materiasWithoutMonthlyGoal = useMemo(() => {
    const ids = new Set(monthlyGoals.map(g => g.materia_id))
    return materiasFiltradas.filter(m => !ids.has(m.id))
  }, [materiasFiltradas, monthlyGoals])

  // ========================================
  // Sessions table
  // ========================================
  const [sessionFilterMateriaId, setSessionFilterMateriaId] = useState('')
  const [sessionFilterConteudoId, setSessionFilterConteudoId] = useState('')
  const { conteudos: filterConteudos, fetchConteudos: fetchFilterConteudos, fetchConteudosByMaterias } = useConteudos()
  const [allConteudos, setAllConteudos] = useState<import('@/types').Conteudo[]>([])

  // Fetch all conteudos for the semester to resolve names in the table
  useEffect(() => {
    const ids = materiasFiltradas.map(m => m.id)
    if (ids.length > 0) {
      fetchConteudosByMaterias(ids).then(setAllConteudos)
    }
  }, [materiasFiltradas, fetchConteudosByMaterias])

  useEffect(() => {
    if (sessionFilterMateriaId) {
      fetchFilterConteudos(sessionFilterMateriaId)
    }
  }, [sessionFilterMateriaId, fetchFilterConteudos])

  const displayedSessions = useMemo(() => {
    let result = filteredSessions
    if (sessionFilterMateriaId) {
      result = result.filter(s => s.materia_id === sessionFilterMateriaId)
    }
    if (sessionFilterConteudoId) {
      result = result.filter(s => s.conteudo_id === sessionFilterConteudoId)
    }
    return [...result].sort((a, b) => {
      if (a.studied_at !== b.studied_at) return b.studied_at.localeCompare(a.studied_at)
      return b.created_at.localeCompare(a.created_at)
    })
  }, [filteredSessions, sessionFilterMateriaId, sessionFilterConteudoId])

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Excluir esta sessão?')) return
    try {
      await deleteSession(id)
      toast.success('Sessão excluída!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  // ========================================
  // Render
  // ========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Semester filter */}
      {semestresDisponiveis.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Semestre:</span>
          {semestresDisponiveis.map(sem => (
            <button
              key={sem}
              onClick={() => setSelectedSemestre(sem)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedSemestre === sem
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-background text-muted-foreground border-border hover:border-indigo-300'
              }`}
            >
              {sem}º
            </button>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-950">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalHoursThisWeek.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Horas esta semana</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessionsToday}</p>
              <p className="text-xs text-muted-foreground">Sessões hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-950">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{currentStreak} dia{currentStreak !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">Sequência</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timer + Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pomodoro Timer */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-lg">Pomodoro</h3>
            </div>

            {/* Materia + Conteudo selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Matéria</Label>
                <Select
                  value={timerMateriaId}
                  onValueChange={setTimerMateriaId}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {materiasFiltradas.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor }} />
                          {m.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Conteúdo</Label>
                <Select
                  value={timerConteudoId || '_all'}
                  onValueChange={v => setTimerConteudoId(v === '_all' ? '' : v)}
                  disabled={!timerMateriaId || isRunning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os conteúdos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos os conteúdos</SelectItem>
                    {timerConteudos.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Alarm type selector */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Alarme</Label>
              <div className="flex rounded-lg border overflow-hidden">
                {(['som', 'visual', 'ambos'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setAlarmType(type)}
                    disabled={isRunning}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                      alarmType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    } disabled:opacity-50`}
                  >
                    {type === 'som' ? 'Som' : type === 'visual' ? 'Visual' : 'Ambos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Foco (min)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={focusMinutes}
                  onChange={e => setFocusMinutes(Math.max(1, parseInt(e.target.value) || 25))}
                  disabled={isRunning}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pausa (min)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={breakMinutes}
                  onChange={e => setBreakMinutes(Math.max(1, parseInt(e.target.value) || 5))}
                  disabled={isRunning}
                  className="h-8"
                />
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center py-4">
              <div
                className="text-6xl font-mono font-bold tabular-nums"
                style={{ color: isBreak ? '#f59e0b' : timerMateria?.cor || '#6366f1' }}
              >
                {formatTime(secondsLeft)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {isRunning
                  ? (isBreak ? 'Intervalo...' : 'Focando...')
                  : (isBreak ? 'Intervalo pausado' : 'Pronto para iniciar')
                }
              </p>
              {timerMateria && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: timerMateria.cor }} />
                  <span className="text-sm font-medium">{timerMateria.nome}</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              {!isRunning ? (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={startTimer}
                >
                  <Play className="mr-2 h-4 w-4" /> {secondsLeft < focusMinutes * 60 || isBreak ? 'Continuar' : 'Iniciar'}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={pauseTimer}>
                    <Pause className="mr-2 h-4 w-4" /> Pausar
                  </Button>
                  {!isBreak && (
                    <Button variant="outline" onClick={startBreakEarly}>
                      <Coffee className="mr-2 h-4 w-4" /> Iniciar Pausa
                    </Button>
                  )}
                </>
              )}
              {(isRunning || secondsLeft < (isBreak ? breakMinutes : focusMinutes) * 60) && !isBreak && (
                <Button variant="outline" onClick={stopAndLog}>
                  <Square className="mr-2 h-4 w-4" /> Parar
                </Button>
              )}
              <Button variant="ghost" onClick={resetTimer} disabled={secondsLeft === focusMinutes * 60 && !isBreak}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-lg">
                  Horas por Matéria — {chartPeriod === 'week' ? 'Semana' : format(monthStart, "MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
              </div>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setChartPeriod('week')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    chartPeriod === 'week'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setChartPeriod('month')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    chartPeriod === 'month'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Mensal
                </button>
              </div>
            </div>

            {materiasWithSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3" />
                <p className="text-sm text-center">
                  Nenhuma sessão registrada {chartPeriod === 'week' ? 'esta semana' : 'este mês'}.<br />
                  Use o Pomodoro para começar!
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis unit="h" tick={{ fontSize: 12 }} width={40} />
                  <Tooltip
                    formatter={(value) => [`${value}h`]}
                    contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {materiasWithSessions.map(mat => (
                    <Bar
                      key={mat.id}
                      dataKey={mat.nome}
                      stackId="a"
                      fill={mat.cor}
                      radius={[2, 2, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Study Goals */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-lg">Metas de Estudo</h3>
          </div>

          <Tabs defaultValue="semanal" onValueChange={v => setActiveGoalTab(v as 'semanal' | 'mensal')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="semanal">Semanal</TabsTrigger>
                <TabsTrigger value="mensal">Mensal</TabsTrigger>
              </TabsList>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  const tipo = activeGoalTab
                  const available = tipo === 'semanal' ? materiasWithoutWeeklyGoal : materiasWithoutMonthlyGoal
                  setGoalTipo(tipo)
                  setGoalMateriaId(available[0]?.id || '')
                  setGoalHoras(tipo === 'semanal' ? '5' : '20')
                  setGoalDialogOpen(true)
                }}
                disabled={(activeGoalTab === 'semanal' ? materiasWithoutWeeklyGoal : materiasWithoutMonthlyGoal).length === 0}
              >
                <Plus className="mr-1 h-4 w-4" /> Nova Meta
              </Button>
            </div>

            <TabsContent value="semanal">
              <GoalsList
                goals={weeklyGoals}
                hoursMap={weeklyHoursPerMateria}
                materias={materiasFiltradas}
                onDelete={handleDeleteGoal}
                emptyMessage="Nenhuma meta semanal definida. Adicione metas para acompanhar seu progresso semanal."
              />
            </TabsContent>

            <TabsContent value="mensal">
              <GoalsList
                goals={monthlyGoals}
                hoursMap={monthlyHoursPerMateria}
                materias={materiasFiltradas}
                onDelete={handleDeleteGoal}
                emptyMessage="Nenhuma meta mensal definida. Adicione metas para acompanhar seu progresso mensal."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <List className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-lg">Sessões Registradas</h3>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <Select
              value={sessionFilterMateriaId || '_all'}
              onValueChange={v => {
                setSessionFilterMateriaId(v === '_all' ? '' : v)
                setSessionFilterConteudoId('')
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as matérias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas as matérias</SelectItem>
                {materiasFiltradas.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor }} />
                      {m.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sessionFilterConteudoId || '_all'}
              onValueChange={v => setSessionFilterConteudoId(v === '_all' ? '' : v)}
              disabled={!sessionFilterMateriaId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos os conteúdos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os conteúdos</SelectItem>
                {filterConteudos.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {displayedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Clock className="h-10 w-10 mb-3" />
              <p className="text-sm text-center">
                Nenhuma sessão encontrada.<br />
                Use o Pomodoro para registrar sessões de estudo!
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Matéria</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedSessions.map(session => {
                    const mat = materias.find(m => m.id === session.materia_id)
                    const conteudo = session.conteudo_id
                      ? allConteudos.find(c => c.id === session.conteudo_id)
                      : null
                    const hours = Math.floor(session.duration_minutes / 60)
                    const mins = session.duration_minutes % 60
                    const durationStr = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`

                    return (
                      <TableRow key={session.id}>
                        <TableCell className="text-sm">
                          {format(new Date(session.studied_at + 'T00:00:00'), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 text-sm">
                            {mat && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: mat.cor }} />}
                            {mat?.nome || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {conteudo?.nome || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {durationStr}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Meta {goalTipo === 'semanal' ? 'Semanal' : 'Mensal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={goalTipo} onValueChange={v => {
                const newTipo = v as 'semanal' | 'mensal'
                setGoalTipo(newTipo)
                const available = newTipo === 'semanal' ? materiasWithoutWeeklyGoal : materiasWithoutMonthlyGoal
                setGoalMateriaId(available[0]?.id || '')
                setGoalHoras(newTipo === 'semanal' ? '5' : '20')
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Matéria</Label>
              <Select value={goalMateriaId} onValueChange={setGoalMateriaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {(goalTipo === 'semanal' ? materiasWithoutWeeklyGoal : materiasWithoutMonthlyGoal).map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor }} />
                        {m.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meta de horas por {goalTipo === 'semanal' ? 'semana' : 'mês'}</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={goalHoras}
                onChange={e => setGoalHoras(e.target.value)}
                placeholder={goalTipo === 'semanal' ? 'Ex: 8' : 'Ex: 30'}
              />
            </div>
            <Button
              onClick={handleSaveGoal}
              disabled={savingGoal}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {savingGoal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Meta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
