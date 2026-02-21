'use client'

import { useState } from 'react'
import { useHorarios } from '@/hooks/useHorarios'
import { useMaterias } from '@/hooks/useMaterias'
import { Horario } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DIAS_GRID = [1, 2, 3, 4, 5, 6] // Segunda a Sábado
const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`)

export default function HorariosPage() {
  const { horarios, loading, addHorario, updateHorario, deleteHorario } = useHorarios()
  const { materias } = useMaterias()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingHorario, setEditingHorario] = useState<Horario | null>(null)
  const [materiaId, setMateriaId] = useState('')
  const [diaSemana, setDiaSemana] = useState('1')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [local, setLocal] = useState('')
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const resetForm = () => {
    setMateriaId('')
    setDiaSemana('1')
    setHoraInicio('08:00')
    setHoraFim('10:00')
    setLocal('')
    setEditingHorario(null)
  }

  const openEdit = (horario: Horario) => {
    setEditingHorario(horario)
    setMateriaId(horario.materia_id)
    setDiaSemana(String(horario.dia_semana))
    setHoraInicio(horario.hora_inicio.slice(0, 5))
    setHoraFim(horario.hora_fim.slice(0, 5))
    setLocal(horario.local || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
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

  const getHorariosForSlot = (dia: number, hora: string) => {
    const horaNum = parseInt(hora.split(':')[0])
    return horarios.filter(h => {
      if (h.dia_semana !== dia) return false
      const inicio = parseInt(h.hora_inicio.split(':')[0])
      const fim = parseInt(h.hora_fim.split(':')[0])
      return horaNum >= inicio && horaNum < fim
    })
  }

  const isHappeningNow = (horario: Horario) => {
    return horario.dia_semana === currentDay &&
      currentTime >= horario.hora_inicio.slice(0, 5) &&
      currentTime < horario.hora_fim.slice(0, 5)
  }

  // Determine which hours to show (only show hours that have classes or are common)
  const activeHours = HORAS.filter(hora => {
    const horaNum = parseInt(hora.split(':')[0])
    // Always show 7-18 range
    if (horaNum >= 7 && horaNum <= 18) return true
    // Also show if there are classes at this time
    return DIAS_GRID.some(dia => getHorariosForSlot(dia, hora).length > 0)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grade Horária</h1>
          <p className="text-muted-foreground">Sua grade semanal de aulas</p>
        </div>
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
                <Label>Matéria *</Label>
                <Select value={materiaId} onValueChange={setMateriaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {materias.map(m => (
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
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-muted p-3 text-center text-sm font-medium">Horário</div>
              {DIAS_GRID.map(dia => (
                <div
                  key={dia}
                  className={`bg-muted p-3 text-center text-sm font-medium ${
                    dia === currentDay ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : ''
                  }`}
                >
                  {DIAS_SEMANA[dia]}
                </div>
              ))}

              {/* Time slots */}
              {activeHours.map(hora => {
                const horaNum = parseInt(hora.split(':')[0])
                return [
                  <div key={`time-${hora}`} className="bg-background p-2 text-center text-xs text-muted-foreground flex items-center justify-center border-t">
                    {hora}
                  </div>,
                  ...DIAS_GRID.map(dia => {
                    const slotHorarios = getHorariosForSlot(dia, hora)
                    return (
                      <div key={`${dia}-${hora}`} className="bg-background p-1 min-h-[60px] border-t">
                        {slotHorarios.map(h => {
                          const startHour = parseInt(h.hora_inicio.split(':')[0])
                          if (startHour !== horaNum) return null
                          const materia = materias.find(m => m.id === h.materia_id)
                          const happening = isHappeningNow(h)
                          return (
                            <div
                              key={h.id}
                              className={`rounded-md p-2 text-xs text-white group relative ${
                                happening ? 'ring-2 ring-green-400 ring-offset-1' : ''
                              }`}
                              style={{ backgroundColor: materia?.cor || '#6366f1' }}
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
                  })
                ]
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
