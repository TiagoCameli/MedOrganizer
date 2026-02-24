'use client'

import { useState, useMemo } from 'react'
import { useEventos } from '@/hooks/useEventos'
import { useMaterias } from '@/hooks/useMaterias'
import { useSemestres } from '@/hooks/useSemestres'
import { useFeriados } from '@/hooks/useFeriados'
import { Evento } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Pencil, Trash2, CalendarDays, ChevronLeft, ChevronRight, Loader2, Filter, Settings2, PartyPopper, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  isPast,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_LABELS: Record<string, string> = {
  prova: 'Prova',
  trabalho: 'Trabalho',
  tarefa: 'Tarefa',
}

const TIPO_COLORS: Record<string, string> = {
  prova: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  trabalho: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  tarefa: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
}

export default function AgendaPage() {
  const { eventos, loading, addEvento, updateEvento, deleteEvento, toggleConcluido } = useEventos()
  const { materias } = useMaterias()
  const { semestres, upsertSemestre, deleteSemestre } = useSemestres()
  const { feriados, addFeriado, deleteFeriado } = useFeriados()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [semDialogOpen, setSemDialogOpen] = useState(false)
  const [feriadoDialogOpen, setFeriadoDialogOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroMateria, setFiltroMateria] = useState<string>('todas')

  // Semester form state
  const [semNumero, setSemNumero] = useState('')
  const [semInicio, setSemInicio] = useState('')
  const [semFim, setSemFim] = useState('')
  const [savingSem, setSavingSem] = useState(false)

  // Feriado form state
  const [feriadoData, setFeriadoData] = useState('')
  const [feriadoDescricao, setFeriadoDescricao] = useState('')
  const [savingFeriado, setSavingFeriado] = useState(false)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<string>('prova')
  const [materiaIds, setMateriaIds] = useState<string[]>([])
  const [dataEntrega, setDataEntrega] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleMateriaId = (id: string) => {
    setMateriaIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  const resetForm = () => {
    setTitulo('')
    setTipo('prova')
    setMateriaIds([])
    setDataEntrega('')
    setDescricao('')
    setEditingEvento(null)
  }

  const openEdit = (evento: Evento) => {
    setEditingEvento(evento)
    setTitulo(evento.titulo)
    setTipo(evento.tipo)
    setMateriaIds(evento.materia_ids)
    setDataEntrega(evento.data_entrega.slice(0, 16))
    setDescricao(evento.descricao || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error('Título é obrigatório'); return }
    if (materiaIds.length === 0) { toast.error('Selecione pelo menos uma matéria'); return }
    if (!dataEntrega) { toast.error('Data de entrega é obrigatória'); return }

    setSaving(true)
    try {
      const data = {
        titulo,
        tipo: tipo as Evento['tipo'],
        materia_ids: materiaIds,
        data_entrega: new Date(dataEntrega).toISOString(),
        descricao: descricao || null,
        concluido: editingEvento?.concluido ?? false,
      }
      if (editingEvento) {
        await updateEvento(editingEvento.id, data)
        toast.success('Evento atualizado!')
      } else {
        await addEvento(data)
        toast.success('Evento adicionado!')
      }
      setDialogOpen(false)
      resetForm()
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este evento?')) return
    try {
      await deleteEvento(id)
      toast.success('Evento excluído!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const handleSaveSemestre = async () => {
    if (!semNumero) { toast.error('Selecione o semestre'); return }
    if (!semInicio || !semFim) { toast.error('Preencha as datas de início e fim'); return }
    if (semFim <= semInicio) { toast.error('Data final deve ser após a data de início'); return }

    setSavingSem(true)
    try {
      await upsertSemestre(Number(semNumero), semInicio, semFim)
      toast.success('Período do semestre salvo!')
      setSemDialogOpen(false)
      setSemNumero('')
      setSemInicio('')
      setSemFim('')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Erro desconhecido'
      toast.error('Erro: ' + msg)
    }
    setSavingSem(false)
  }

  const handleDeleteSemestre = async (id: string) => {
    if (!confirm('Remover período deste semestre?')) return
    try {
      await deleteSemestre(id)
      toast.success('Período removido!')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const openEditSemestre = (sem: { numero: number; data_inicio: string; data_fim: string }) => {
    setSemNumero(String(sem.numero))
    setSemInicio(sem.data_inicio)
    setSemFim(sem.data_fim)
    setSemDialogOpen(true)
  }

  const handleSaveFeriado = async () => {
    if (!feriadoData) { toast.error('Data é obrigatória'); return }
    if (!feriadoDescricao.trim()) { toast.error('Descrição é obrigatória'); return }

    setSavingFeriado(true)
    try {
      await addFeriado({ data: feriadoData, descricao: feriadoDescricao })
      toast.success('Feriado adicionado!')
      setFeriadoDialogOpen(false)
      setFeriadoData('')
      setFeriadoDescricao('')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Erro desconhecido'
      toast.error('Erro: ' + msg)
    }
    setSavingFeriado(false)
  }

  const handleDeleteFeriado = async (id: string) => {
    if (!confirm('Remover este feriado?')) return
    try {
      await deleteFeriado(id)
      toast.success('Feriado removido!')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const feriadosDates = useMemo(() => {
    return new Set(feriados.map(f => f.data))
  }, [feriados])

  const filteredEventos = useMemo(() => {
    return eventos.filter(e => {
      if (filtroTipo !== 'todos' && e.tipo !== filtroTipo) return false
      if (filtroMateria !== 'todas' && !e.materia_ids.includes(filtroMateria)) return false
      return true
    })
  }, [eventos, filtroTipo, filtroMateria])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { locale: ptBR })
    const calEnd = endOfWeek(monthEnd, { locale: ptBR })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const getEventosForDay = (day: Date) => {
    return filteredEventos.filter(e => isSameDay(new Date(e.data_entrega), day))
  }

  const getCountdownBadge = (dataEntrega: string, concluido: boolean) => {
    if (concluido) return <Badge variant="outline" className="text-green-600 border-green-300">Concluído</Badge>
    const days = differenceInDays(new Date(dataEntrega), new Date())
    if (days < 0) return <Badge variant="destructive">Atrasado</Badge>
    if (days === 0) return <Badge className="bg-red-500">Hoje</Badge>
    if (days === 1) return <Badge className="bg-orange-500">Amanhã</Badge>
    if (days <= 3) return <Badge className="bg-orange-400">Em {days} dias</Badge>
    if (days <= 7) return <Badge className="bg-yellow-500 text-yellow-900">Em {days} dias</Badge>
    return <Badge variant="secondary">Em {days} dias</Badge>
  }

  const upcomingEventos = useMemo(() => {
    const now = new Date()
    return filteredEventos
      .filter(e => !e.concluido && new Date(e.data_entrega) >= now)
      .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())
  }, [filteredEventos])

  const completedEventos = useMemo(() => {
    return filteredEventos
      .filter(e => e.concluido)
      .sort((a, b) => new Date(b.data_entrega).getTime() - new Date(a.data_entrega).getTime())
  }, [filteredEventos])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Provas, trabalhos e tarefas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvento ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Prova de Anatomia" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prova">Prova</SelectItem>
                      <SelectItem value="trabalho">Trabalho</SelectItem>
                      <SelectItem value="tarefa">Tarefa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Matéria(s) * <span className="text-muted-foreground font-normal text-xs">(selecione pelo menos uma)</span></Label>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                    {materias.map(m => (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 hover:bg-muted/50">
                        <Checkbox
                          checked={materiaIds.includes(m.id)}
                          onCheckedChange={() => toggleMateriaId(m.id)}
                        />
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.cor }} />
                        <span className="text-sm truncate">{m.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data e Hora *</Label>
                <Input type="datetime-local" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes adicionais..." />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingEvento ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="prova">Provas</SelectItem>
            <SelectItem value="trabalho">Trabalhos</SelectItem>
            <SelectItem value="tarefa">Tarefas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroMateria} onValueChange={setFiltroMateria}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as matérias</SelectItem>
            {materias.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {calendarDays.map(day => {
              const dayEventos = getEventosForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const dayStr = format(day, 'yyyy-MM-dd')
              const isFeriado = feriadosDates.has(dayStr)
              const feriadoInfo = isFeriado ? feriados.find(f => f.data === dayStr) : null
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1 border rounded-md ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  } ${today ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-700' : ''} ${
                    isFeriado && isCurrentMonth ? 'bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700' : ''
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 flex items-center gap-1 ${today ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {format(day, 'd')}
                    {isFeriado && <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 leading-tight">Feriado</Badge>}
                  </div>
                  {isFeriado && feriadoInfo && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate mb-0.5" title={feriadoInfo.descricao}>
                      {feriadoInfo.descricao}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {dayEventos.slice(0, 3).map(e => {
                      const firstMateria = materias.find(m => m.id === e.materia_ids[0])
                      return (
                        <div
                          key={e.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${e.concluido ? 'line-through opacity-60' : ''}`}
                          style={{ backgroundColor: (firstMateria?.cor || '#6366f1') + '30', color: firstMateria?.cor || '#6366f1' }}
                          onClick={() => openEdit(e)}
                          title={`${TIPO_LABELS[e.tipo]}: ${e.titulo}`}
                        >
                          {e.titulo}
                        </div>
                      )
                    })}
                    {dayEventos.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayEventos.length - 3} mais</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Próximos Eventos</h2>
        {upcomingEventos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum evento pendente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingEventos.map(evento => {
              const eventoMaterias = materias.filter(m => evento.materia_ids.includes(m.id))
              return (
                <Card key={evento.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Checkbox
                      checked={evento.concluido}
                      onCheckedChange={(checked) => toggleConcluido(evento.id, checked as boolean)}
                    />
                    <div className="flex -space-x-1 flex-shrink-0">
                      {eventoMaterias.map(m => (
                        <div key={m.id} className="w-3 h-3 rounded-full border border-background" style={{ backgroundColor: m.cor }} title={m.nome} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${evento.concluido ? 'line-through text-muted-foreground' : ''}`}>
                          {evento.titulo}
                        </span>
                        <Badge className={TIPO_COLORS[evento.tipo]} variant="secondary">
                          {TIPO_LABELS[evento.tipo]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {eventoMaterias.map(m => m.nome).join(', ')} — {format(new Date(evento.data_entrega), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getCountdownBadge(evento.data_entrega, evento.concluido)}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(evento)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(evento.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Completed events list */}
      {completedEventos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Concluídos
            <Badge variant="secondary">{completedEventos.length}</Badge>
          </h2>
          <div className="space-y-2">
            {completedEventos.map(evento => {
              const eventoMaterias = materias.filter(m => evento.materia_ids.includes(m.id))
              return (
                <Card key={evento.id} className="opacity-75">
                  <CardContent className="flex items-center gap-4 p-4">
                    <Checkbox
                      checked={evento.concluido}
                      onCheckedChange={(checked) => toggleConcluido(evento.id, checked as boolean)}
                    />
                    <div className="flex -space-x-1 flex-shrink-0">
                      {eventoMaterias.map(m => (
                        <div key={m.id} className="w-3 h-3 rounded-full border border-background" style={{ backgroundColor: m.cor }} title={m.nome} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium line-through text-muted-foreground">
                          {evento.titulo}
                        </span>
                        <Badge className={TIPO_COLORS[evento.tipo]} variant="secondary">
                          {TIPO_LABELS[evento.tipo]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {eventoMaterias.map(m => m.nome).join(', ')} — {format(new Date(evento.data_entrega), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-green-600 border-green-300">Concluído</Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(evento)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(evento.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Feriados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <PartyPopper className="h-4 w-4 text-amber-600" />
              Feriados
            </CardTitle>
            <Dialog open={feriadoDialogOpen} onOpenChange={(open) => { setFeriadoDialogOpen(open); if (!open) { setFeriadoData(''); setFeriadoDescricao('') } }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-1 h-3 w-3" /> Adicionar Feriado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Feriado</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input type="date" value={feriadoData} onChange={(e) => setFeriadoData(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input value={feriadoDescricao} onChange={(e) => setFeriadoDescricao(e.target.value)} placeholder="Ex: Feriado Nacional" />
                  </div>
                  <Button onClick={handleSaveFeriado} disabled={savingFeriado} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {savingFeriado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {feriados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum feriado cadastrado. Clique em &quot;Adicionar Feriado&quot; para configurar.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {feriados.map(feriado => {
                const feriadoDate = new Date(feriado.data + 'T00:00:00')
                return (
                  <div
                    key={feriado.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{feriado.descricao}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(feriadoDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteFeriado(feriado.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Períodos dos Semestres */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              Períodos dos Semestres
            </CardTitle>
            <Dialog open={semDialogOpen} onOpenChange={(open) => { setSemDialogOpen(open); if (!open) { setSemNumero(''); setSemInicio(''); setSemFim('') } }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-1 h-3 w-3" /> Definir Período
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Período do Semestre</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Semestre *</Label>
                    <Select value={semNumero} onValueChange={setSemNumero}>
                      <SelectTrigger><SelectValue placeholder="Selecione o semestre" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(s => (
                          <SelectItem key={s} value={String(s)}>{s}º Semestre</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Início *</Label>
                      <Input type="date" value={semInicio} onChange={(e) => setSemInicio(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Término *</Label>
                      <Input type="date" value={semFim} onChange={(e) => setSemFim(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleSaveSemestre} disabled={savingSem} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {savingSem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {semestres.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum período definido. Clique em &quot;Definir Período&quot; para configurar.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {semestres.map(sem => {
                const now = new Date()
                const inicio = new Date(sem.data_inicio + 'T00:00:00')
                const fim = new Date(sem.data_fim + 'T23:59:59')
                const isActive = now >= inicio && now <= fim
                return (
                  <div
                    key={sem.id}
                    className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                      isActive ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-700' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium">
                        {sem.numero}º Semestre
                        {isActive && <Badge className="ml-2 bg-indigo-600 text-white text-[10px]">Atual</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(inicio, 'dd/MM/yyyy')} — {format(fim, 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSemestre(sem)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSemestre(sem.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
