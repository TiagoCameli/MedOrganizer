'use client'

import { useState, useMemo } from 'react'
import { useHorarios } from '@/hooks/useHorarios'
import { useMaterias } from '@/hooks/useMaterias'
import { useFeriados } from '@/hooks/useFeriados'
import { Horario } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Clock, Loader2, Filter, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { GradeEstudo } from './GradeEstudo'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DIAS_GRID = [1, 2, 3, 4, 5, 6] // Segunda a Sábado
const PIXELS_PER_HOUR = 64

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function HorariosPage() {
  const { horarios, loading, addHorario, updateHorario, deleteHorario } = useHorarios()
  const { materias } = useMaterias()
  const { feriados } = useFeriados()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHorario, setEditingHorario] = useState<Horario | null>(null)
  const [formSemestre, setFormSemestre] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [diaSemana, setDiaSemana] = useState('1')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [local, setLocal] = useState('')
  const [saving, setSaving] = useState(false)
  const [filtroSemestre, setFiltroSemestre] = useState<string>('todos')

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Calcular as datas da semana atual (Seg-Sáb)
  const getWeekDates = () => {
    const dates: Record<number, number> = {}
    for (const dia of DIAS_GRID) {
      const diff = dia - currentDay
      const date = new Date(now)
      date.setDate(now.getDate() + diff)
      dates[dia] = date.getDate()
    }
    return dates
  }
  const weekDates = getWeekDates()

  // Map each day of the grid to its full YYYY-MM-DD date and check for feriados
  const weekFeriados = useMemo(() => {
    const map: Record<number, { date: string; feriado: string | null }> = {}
    for (const dia of DIAS_GRID) {
      const diff = dia - currentDay
      const date = new Date(now)
      date.setDate(now.getDate() + diff)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const feriado = feriados.find(f => f.data === dateStr)
      map[dia] = { date: dateStr, feriado: feriado?.descricao || null }
    }
    return map
  }, [feriados, currentDay, now])

  const resetForm = () => {
    setFormSemestre('')
    setMateriaId('')
    setDiaSemana('1')
    setHoraInicio('08:00')
    setHoraFim('10:00')
    setLocal('')
    setEditingHorario(null)
  }

  // Matérias filtradas pelo semestre selecionado no form
  const materiasFiltradas = formSemestre
    ? materias.filter(m => m.semestre === Number(formSemestre))
    : materias

  const openEdit = (horario: Horario) => {
    setEditingHorario(horario)
    const mat = materias.find(m => m.id === horario.materia_id)
    setFormSemestre(mat?.semestre ? String(mat.semestre) : '')
    setMateriaId(horario.materia_id)
    setDiaSemana(String(horario.dia_semana))
    setHoraInicio(horario.hora_inicio.slice(0, 5))
    setHoraFim(horario.hora_fim.slice(0, 5))
    setLocal(horario.local || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formSemestre) { toast.error('Selecione o semestre'); return }
    if (!materiaId) { toast.error('Selecione uma matéria'); return }
    if (horaFim <= horaInicio) { toast.error('Horário de término deve ser após o início'); return }

    setSaving(true)
    try {
      const data = {
        materia_id: materiaId,
        dia_semana: parseInt(diaSemana),
        hora_inicio: horaInicio + ':00',
        hora_fim: horaFim + ':00',
        local: local || null,
      }
      if (editingHorario) {
        await updateHorario(editingHorario.id, data)
        toast.success('Horário atualizado!')
      } else {
        await addHorario(data)
        toast.success('Horário adicionado!')
      }
      setDialogOpen(false)
      resetForm()
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este horário?')) return
    try {
      await deleteHorario(id)
      toast.success('Horário excluído!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  // Semestres disponíveis (extraídos das matérias cadastradas)
  const semestresDisponiveis = [...new Set(materias.map(m => m.semestre).filter(Boolean) as number[])].sort((a, b) => a - b)

  // Horários filtrados por semestre
  const horariosFiltrados = filtroSemestre === 'todos'
    ? horarios
    : horarios.filter(h => {
        const materia = materias.find(m => m.id === h.materia_id)
        return materia?.semestre === Number(filtroSemestre)
      })

  const getHorariosForDay = (dia: number) => {
    return horariosFiltrados.filter(h => h.dia_semana === dia)
  }

  const isHappeningNow = (horario: Horario) => {
    return horario.dia_semana === currentDay &&
      currentTime >= horario.hora_inicio.slice(0, 5) &&
      currentTime < horario.hora_fim.slice(0, 5)
  }

  // Determine visible hour range based on classes
  const allStartHours = horariosFiltrados.map(h => Math.floor(timeToMinutes(h.hora_inicio) / 60))
  const allEndHours = horariosFiltrados.map(h => Math.ceil(timeToMinutes(h.hora_fim) / 60))
  const minHour = allStartHours.length > 0 ? Math.min(7, ...allStartHours) : 7
  const maxHour = allEndHours.length > 0 ? Math.max(19, ...allEndHours) : 19
  const gridStartMinutes = minHour * 60
  const totalGridHeight = (maxHour - minHour) * PIXELS_PER_HOUR
  const visibleHours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => {
    const h = minHour + i
    return `${String(h).padStart(2, '0')}:00`
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grade</h1>
        <p className="text-muted-foreground">Grade horária e planejamento de estudo</p>
      </div>

      <Tabs defaultValue="aulas">
        <TabsList>
          <TabsTrigger value="aulas">
            <Clock className="mr-2 h-4 w-4" /> Grade de Aulas
          </TabsTrigger>
          <TabsTrigger value="estudo">
            <BookOpen className="mr-2 h-4 w-4" /> Grade de Estudo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aulas">
          <div className="space-y-6">
            {/* Header with add button */}
            <div className="flex items-center justify-between">
              <div />
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Novo Horário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingHorario ? 'Editar Horário' : 'Novo Horário'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Semestre *</Label>
                      <Select value={formSemestre} onValueChange={(val) => { setFormSemestre(val); setMateriaId('') }}>
                        <SelectTrigger><SelectValue placeholder="Selecione o semestre" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(s => (
                            <SelectItem key={s} value={String(s)}>{s}º Semestre</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Matéria *</Label>
                      {!formSemestre ? (
                        <p className="text-sm text-muted-foreground py-2">Selecione o semestre primeiro</p>
                      ) : materiasFiltradas.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Nenhuma matéria cadastrada no {formSemestre}º semestre</p>
                      ) : (
                        <Select value={materiaId} onValueChange={setMateriaId}>
                          <SelectTrigger><SelectValue placeholder="Selecione a matéria" /></SelectTrigger>
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
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Dia da Semana *</Label>
                      <Select value={diaSemana} onValueChange={setDiaSemana}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DIAS_SEMANA.map((dia, i) => (
                            <SelectItem key={i} value={String(i)}>{dia}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Início *</Label>
                        <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Término *</Label>
                        <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Local (opcional)</Label>
                      <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Sala 201" />
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingHorario ? 'Atualizar' : 'Adicionar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filtro por semestre */}
            {semestresDisponiveis.length > 0 && (
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filtroSemestre} onValueChange={setFiltroSemestre}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os semestres</SelectItem>
                    {semestresDisponiveis.map(s => (
                      <SelectItem key={s} value={String(s)}>{s}º Semestre</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtroSemestre !== 'todos' && (
                  <Badge variant="secondary">{horariosFiltrados.length} aula(s)</Badge>
                )}
              </div>
            )}

            {materias.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Cadastre matérias primeiro para criar sua grade horária.
                  </p>
                </CardContent>
              </Card>
            ) : horarios.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhum horário cadastrado ainda.<br />
                    Adicione sua primeira aula!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header */}
                  <div className="grid gap-px bg-border rounded-t-lg overflow-hidden" style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}>
                    <div className="bg-muted p-3 text-center text-sm font-medium">Horário</div>
                    {DIAS_GRID.map(dia => {
                      const isFeriado = !!weekFeriados[dia]?.feriado
                      return (
                        <div
                          key={dia}
                          className={`bg-muted p-3 text-center font-medium ${
                            dia === currentDay ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : ''
                          } ${isFeriado ? 'bg-amber-50 dark:bg-amber-950' : ''}`}
                        >
                          <div className="text-sm">{DIAS_SEMANA[dia]}</div>
                          <div className={`text-lg font-bold ${dia === currentDay ? '' : 'text-muted-foreground'}`}>{weekDates[dia]}</div>
                          {isFeriado && <Badge className="bg-amber-500 text-white text-[10px] mt-1">Feriado</Badge>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Body */}
                  <div className="grid gap-px bg-border rounded-b-lg" style={{ gridTemplateColumns: '60px repeat(6, 1fr)' }}>
                    {/* Time labels column */}
                    <div className="bg-background relative" style={{ height: totalGridHeight }}>
                      {visibleHours.map((hora, i) => (
                        <div
                          key={hora}
                          className="absolute left-0 right-0 flex items-center justify-center"
                          style={{ top: i * PIXELS_PER_HOUR - 8, height: 16 }}
                        >
                          <span className="text-[11px] text-muted-foreground bg-background px-1 leading-none">{hora}</span>
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {DIAS_GRID.map(dia => {
                      const dayHorarios = getHorariosForDay(dia)
                      const diaFeriado = weekFeriados[dia]?.feriado
                      return (
                        <div
                          key={dia}
                          className="bg-background relative"
                          style={{ height: totalGridHeight }}
                        >
                          {/* Hour grid lines */}
                          {visibleHours.map((hora, i) => (
                            <div
                              key={hora}
                              className="absolute left-0 right-0 border-t border-border/50"
                              style={{ top: i * PIXELS_PER_HOUR }}
                            />
                          ))}

                          {/* Feriado overlay */}
                          {diaFeriado && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-amber-100/70 dark:bg-amber-950/70">
                              <div className="text-center px-2">
                                <div className="text-amber-700 dark:text-amber-400 font-semibold text-sm">Feriado</div>
                                <div className="text-amber-600 dark:text-amber-500 text-xs mt-1">{diaFeriado}</div>
                                <div className="text-amber-600/80 dark:text-amber-500/80 text-[10px] mt-0.5">Sem aulas</div>
                              </div>
                            </div>
                          )}

                          {/* Class blocks */}
                          {dayHorarios.map(h => {
                            const materia = materias.find(m => m.id === h.materia_id)
                            const happening = isHappeningNow(h)
                            const startMin = timeToMinutes(h.hora_inicio)
                            const endMin = timeToMinutes(h.hora_fim)
                            const top = ((startMin - gridStartMinutes) / 60) * PIXELS_PER_HOUR
                            const height = ((endMin - startMin) / 60) * PIXELS_PER_HOUR

                            return (
                              <div
                                key={h.id}
                                className={`absolute left-1 right-1 rounded-md px-2 py-1.5 text-xs text-white group overflow-hidden z-10 ${
                                  happening && !diaFeriado ? 'ring-2 ring-green-400 ring-offset-1' : ''
                                } ${diaFeriado ? 'opacity-30' : ''}`}
                                style={{
                                  backgroundColor: materia?.cor || '#6366f1',
                                  top: top + 1,
                                  height: height - 2,
                                }}
                              >
                                <div className="font-medium truncate">{materia?.nome}</div>
                                <div className="opacity-80">{h.hora_inicio.slice(0, 5)} - {h.hora_fim.slice(0, 5)}</div>
                                {h.local && <div className="opacity-80">{h.local}</div>}
                                {happening && <div className="text-green-200 font-medium mt-1">Agora</div>}
                                <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                  <button onClick={() => openEdit(h)} className="p-1 bg-white/20 rounded hover:bg-white/40">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => handleDelete(h.id)} className="p-1 bg-white/20 rounded hover:bg-white/40">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="estudo">
          <GradeEstudo materias={materias} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
