'use client'

import { useMemo, useEffect } from 'react'
import { useHorarios } from '@/hooks/useHorarios'
import { useEventos } from '@/hooks/useEventos'
import { useMaterias } from '@/hooks/useMaterias'
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition'
import { useStudySessions } from '@/hooks/useStudySessions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Clock, CalendarDays, AlertTriangle, BookOpen, Loader2,
  Brain, Timer, GraduationCap, TrendingDown, Target,
} from 'lucide-react'
import { format, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import Link from 'next/link'

export default function DashboardPage() {
  const { horarios, loading: loadingHorarios } = useHorarios()
  const { eventos, loading: loadingEventos, toggleConcluido } = useEventos()
  const { materias, loading: loadingMaterias } = useMaterias()
  const { dueCards, reviewStats, fetchDueCards, fetchReviewStats, loading: loadingSRS } = useSpacedRepetition()
  const { sessions, goals, loading: loadingSessions, fetchSessions } = useStudySessions()

  const loading = loadingHorarios || loadingEventos || loadingMaterias

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const weekStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [])
  const weekEnd = useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), [])

  useEffect(() => {
    if (materias.length === 0 && !loadingMaterias) return
    if (loadingMaterias) return

    fetchDueCards()
    fetchReviewStats(materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor })))
    fetchSessions(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'))
  }, [materias, loadingMaterias]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Computed data ---

  const todayClasses = useMemo(() => {
    return horarios
      .filter(h => h.dia_semana === currentDay)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }, [horarios, currentDay])

  const upcomingExams = useMemo(() => {
    return eventos
      .filter(e => !e.concluido && e.tipo === 'prova' && new Date(e.data_entrega) >= now)
      .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
      .slice(0, 5)
  }, [eventos])

  const upcomingEvents = useMemo(() => {
    return eventos
      .filter(e => !e.concluido && e.tipo !== 'prova' && new Date(e.data_entrega) >= now)
      .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
      .slice(0, 5)
  }, [eventos])

  const urgentEvents = useMemo(() => {
    return eventos
      .filter(e => {
        if (e.concluido) return false
        const days = differenceInDays(new Date(e.data_entrega), now)
        return days >= -1 && days <= 3
      })
      .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
  }, [eventos])

  const totalHoursThisWeek = useMemo(() => {
    return sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60
  }, [sessions])

  const mostBehindSubject = useMemo(() => {
    if (reviewStats.length === 0) return null
    const sorted = [...reviewStats]
      .filter(s => s.due > 0)
      .sort((a, b) => {
        if (b.due !== a.due) return b.due - a.due
        return a.retention_rate - b.retention_rate
      })
    return sorted[0] || null
  }, [reviewStats])

  const dailyStudyData = useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayLabel = format(day, 'EEE', { locale: ptBR })
      const totalMin = sessions
        .filter(s => s.studied_at === dateStr)
        .reduce((sum, s) => sum + s.duration_minutes, 0)
      return {
        day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1, 3),
        hours: +(totalMin / 60).toFixed(1),
      }
    })
  }, [sessions, weekStart, weekEnd])

  const weeklyGoals = useMemo(() => {
    return goals.filter(g => g.tipo === 'semanal')
  }, [goals])

  const weeklyHoursPerMateria = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of sessions) {
      map[s.materia_id] = (map[s.materia_id] || 0) + s.duration_minutes / 60
    }
    return map
  }, [sessions])

  // --- Helper functions ---

  const isHappeningNow = (horaInicio: string, horaFim: string) => {
    return currentTime >= horaInicio.slice(0, 5) && currentTime < horaFim.slice(0, 5)
  }

  const getCountdownText = (dataEntrega: string) => {
    const days = differenceInDays(new Date(dataEntrega), now)
    if (days < 0) return 'Atrasado'
    if (days === 0) return 'Hoje'
    if (days === 1) return 'Amanhã'
    return `Em ${days} dias`
  }

  const getUrgencyColor = (dataEntrega: string) => {
    const days = differenceInDays(new Date(dataEntrega), now)
    if (days < 0) return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
    if (days === 0) return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
    if (days === 1) return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-400'
    return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-400'
  }

  const TIPO_LABELS: Record<string, string> = {
    prova: 'Prova',
    trabalho: 'Trabalho',
    tarefa: 'Tarefa',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard Acadêmico</h1>
        <p className="text-muted-foreground">
          {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stat Cards - 6 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{materias.length}</p>
              <p className="text-xs text-muted-foreground">Matérias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayClasses.length}</p>
              <p className="text-xs text-muted-foreground">Aulas hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-950">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              {loadingSRS ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-2xl font-bold">{dueCards.length}</p>
              )}
              <p className="text-xs text-muted-foreground">Flashcards pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-950">
              <Timer className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              {loadingSessions ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-2xl font-bold">{totalHoursThisWeek.toFixed(1)}h</p>
              )}
              <p className="text-xs text-muted-foreground">Horas na semana</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{eventos.filter(e => !e.concluido).length}</p>
              <p className="text-xs text-muted-foreground">Eventos pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-950">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{urgentEvents.length}</p>
              <p className="text-xs text-muted-foreground">Urgentes (3 dias)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matéria mais atrasada */}
      {mostBehindSubject && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-950">
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: mostBehindSubject.materia_cor }}
                />
                <span className="font-medium truncate">{mostBehindSubject.materia_nome}</span>
                <Badge variant="secondary" className="text-xs">Matéria mais atrasada</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {mostBehindSubject.due} cards pendentes — {mostBehindSubject.retention_rate}% retenção
              </p>
            </div>
            <Link
              href="/dashboard/flashcards"
              className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex-shrink-0"
            >
              Revisar agora
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Próximas Provas */}
      {upcomingExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              Próximas Provas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingExams.map(e => {
                const eventoMaterias = materias.filter(m => e.materia_ids.includes(m.id))
                const days = differenceInDays(new Date(e.data_entrega), now)
                const isUrgent = days <= 3
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 rounded-lg p-3 ${
                      isUrgent
                        ? getUrgencyColor(e.data_entrega)
                        : 'bg-muted/50'
                    } border`}
                  >
                    <Checkbox
                      checked={e.concluido}
                      onCheckedChange={(checked) => toggleConcluido(e.id, checked as boolean)}
                    />
                    <div className="flex -space-x-1 flex-shrink-0">
                      {eventoMaterias.map(m => (
                        <div key={m.id} className="w-3 h-3 rounded-full border border-background" style={{ backgroundColor: m.cor }} title={m.nome} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{e.titulo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {eventoMaterias.map(m => m.nome).join(', ')} — {format(new Date(e.data_entrega), "dd/MM 'às' HH:mm")}
                      </p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${isUrgent ? '' : 'text-muted-foreground'}`}>
                      {getCountdownText(e.data_entrega)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aulas de Hoje + Próximos Eventos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-emerald-600" />
              Aulas de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma aula programada para hoje
              </p>
            ) : (
              <div className="space-y-3">
                {todayClasses.map(h => {
                  const materia = materias.find(m => m.id === h.materia_id)
                  const happening = isHappeningNow(h.hora_inicio, h.hora_fim)
                  return (
                    <div
                      key={h.id}
                      className={`flex items-center gap-3 rounded-lg p-3 ${
                        happening
                          ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: materia?.cor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{materia?.nome}</span>
                          {happening && (
                            <Badge className="bg-green-500 text-white text-xs">Agora</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {h.hora_inicio.slice(0, 5)} - {h.hora_fim.slice(0, 5)}
                          {h.local && ` | ${h.local}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum evento pendente
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(e => {
                  const eventoMaterias = materias.filter(m => e.materia_ids.includes(m.id))
                  const days = differenceInDays(new Date(e.data_entrega), now)
                  const isUrgent = days <= 3
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 rounded-lg p-3 ${
                        isUrgent
                          ? getUrgencyColor(e.data_entrega)
                          : 'bg-muted/50'
                      } border`}
                    >
                      <Checkbox
                        checked={e.concluido}
                        onCheckedChange={(checked) => toggleConcluido(e.id, checked as boolean)}
                      />
                      <div className="flex -space-x-1 flex-shrink-0">
                        {eventoMaterias.map(m => (
                          <div key={m.id} className="w-3 h-3 rounded-full border border-background" style={{ backgroundColor: m.cor }} title={m.nome} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{e.titulo}</span>
                          <Badge variant="secondary" className="text-xs">{TIPO_LABELS[e.tipo]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {eventoMaterias.map(m => m.nome).join(', ')} — {format(new Date(e.data_entrega), "dd/MM 'às' HH:mm")}
                        </p>
                      </div>
                      <span className={`text-xs font-medium flex-shrink-0 ${isUrgent ? '' : 'text-muted-foreground'}`}>
                        {getCountdownText(e.data_entrega)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Horas Estudadas + Metas Semanais */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="h-5 w-5 text-emerald-600" />
              Horas Estudadas na Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Timer className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma sessão registrada esta semana</p>
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dailyStudyData}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}h`, 'Estudado']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-card)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="hours"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  <span className="font-semibold text-foreground">{totalHoursThisWeek.toFixed(1)}h</span> estudadas esta semana
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-emerald-600" />
              Metas Semanais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : weeklyGoals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma meta semanal definida</p>
              </div>
            ) : (
              <div className="space-y-4">
                {weeklyGoals.map(goal => {
                  const mat = materias.find(m => m.id === goal.materia_id)
                  if (!mat) return null
                  const actual = weeklyHoursPerMateria[goal.materia_id] || 0
                  const pct = Math.min(100, (actual / goal.horas_meta) * 100)
                  const completed = actual >= goal.horas_meta
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: mat.cor }}
                          />
                          <span className="truncate">{mat.nome}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {actual.toFixed(1)}h / {goal.horas_meta}h
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas Urgentes */}
      {urgentEvents.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Alertas — Entregas Próximas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentEvents.map(e => {
                const eventoMaterias = materias.filter(m => e.materia_ids.includes(m.id))
                return (
                  <div key={e.id} className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex -space-x-1 flex-shrink-0">
                        {eventoMaterias.map(m => (
                          <div key={m.id} className="w-2 h-2 rounded-full border border-background" style={{ backgroundColor: m.cor }} />
                        ))}
                      </div>
                      <span className="font-medium truncate">{e.titulo}</span>
                      <span className="text-muted-foreground truncate">({eventoMaterias.map(m => m.nome).join(', ')})</span>
                    </div>
                    <Badge variant="destructive" className="flex-shrink-0">
                      {getCountdownText(e.data_entrega)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
