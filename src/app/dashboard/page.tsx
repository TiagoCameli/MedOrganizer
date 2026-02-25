'use client'

import { useMemo } from 'react'
import { useHorarios } from '@/hooks/useHorarios'
import { useEventos } from '@/hooks/useEventos'
import { useMaterias } from '@/hooks/useMaterias'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Clock, CalendarDays, AlertTriangle, BookOpen, Loader2 } from 'lucide-react'
import { format, differenceInDays, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DashboardPage() {
  const { horarios, loading: loadingHorarios } = useHorarios()
  const { eventos, loading: loadingEventos, toggleConcluido } = useEventos()
  const { materias, loading: loadingMaterias } = useMaterias()

  const loading = loadingHorarios || loadingEventos || loadingMaterias

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const todayClasses = useMemo(() => {
    return horarios
      .filter(h => h.dia_semana === currentDay)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }, [horarios, currentDay])

  const upcomingEvents = useMemo(() => {
    return eventos
      .filter(e => !e.concluido && new Date(e.data_entrega) >= now)
      .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
      .slice(0, 5)
  }, [eventos, now])

  const urgentEvents = useMemo(() => {
    return eventos
      .filter(e => {
        if (e.concluido) return false
        const days = differenceInDays(new Date(e.data_entrega), now)
        return days >= -1 && days <= 3
      })
      .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
  }, [eventos, now])

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
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-muted-foreground">
          {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's classes */}
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

        {/* Upcoming events */}
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

      {/* Urgent alerts */}
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
