'use client'

import { useState, useMemo } from 'react'
import { useMaterias } from '@/hooks/useMaterias'
import { useHorarios } from '@/hooks/useHorarios'
import { useEventos } from '@/hooks/useEventos'
import { useNotas } from '@/hooks/useNotas'
import { Materia } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, BookOpen, Loader2, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb', '#7c3aed', '#64748b',
  '#0ea5e9', '#0284c7', '#0d9488', '#059669',
  '#16a34a', '#65a30d', '#ca8a04', '#d97706',
  '#ea580c', '#dc2626', '#e11d48', '#be185d',
  '#9333ea', '#4f46e5', '#475569', '#1e293b',
]

export default function MateriasPage() {
  const { materias, loading, addMateria, updateMateria, deleteMateria } = useMaterias()
  const { horarios } = useHorarios()
  const { eventos } = useEventos()
  const { notas, calcularMedia } = useNotas()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null)
  const [nome, setNome] = useState('')
  const [professor, setProfessor] = useState('')
  const [semestre, setSemestre] = useState('')
  const [cor, setCor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setNome('')
    setProfessor('')
    setSemestre('')
    setCor('#6366f1')
    setEditingMateria(null)
  }

  const openEdit = (materia: Materia) => {
    setEditingMateria(materia)
    setNome(materia.nome)
    setProfessor(materia.professor || '')
    setSemestre(materia.semestre ? String(materia.semestre) : '')
    setCor(materia.cor)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('Nome da matéria é obrigatório')
      return
    }
    setSaving(true)
    try {
      const materiaData = { nome, professor: professor || null, semestre: semestre ? Number(semestre) : null, cor }
      if (editingMateria) {
        await updateMateria(editingMateria.id, materiaData)
        toast.success('Matéria atualizada!')
      } else {
        await addMateria(materiaData)
        toast.success('Matéria adicionada!')
      }
      setDialogOpen(false)
      resetForm()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : (error as { message?: string })?.message || JSON.stringify(error)
      toast.error('Erro ao salvar: ' + msg)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá também os horários, eventos e notas desta matéria.')) return
    try {
      await deleteMateria(id)
      toast.success('Matéria excluída!')
    } catch (error: unknown) {
      toast.error('Erro ao excluir: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const getAulasPorSemana = (materiaId: string) => {
    return horarios.filter(h => h.materia_id === materiaId).length
  }

  const getProximaProva = (materiaId: string) => {
    const now = new Date()
    const proxima = eventos
      .filter(e => e.materia_ids.includes(materiaId) && e.tipo === 'prova' && new Date(e.data_entrega) > now)
      .sort((a, b) => new Date(a.data_entrega).getTime() - new Date(b.data_entrega).getTime())[0]
    if (!proxima) return null
    return new Date(proxima.data_entrega).toLocaleDateString('pt-BR')
  }

  const getMediaMateria = (materiaId: string) => {
    const notasMateria = notas.filter(n => n.materia_id === materiaId)
    return calcularMedia(notasMateria)
  }

  const materiasPorSemestre = useMemo(() => {
    const groups: { semestre: number | null; label: string; materias: Materia[] }[] = []
    const map = new Map<number | null, Materia[]>()

    for (const m of materias) {
      const key = m.semestre ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }

    // Semestres numéricos ordenados
    const keys = [...map.keys()].sort((a, b) => {
      if (a === null) return 1
      if (b === null) return -1
      return a - b
    })

    for (const key of keys) {
      groups.push({
        semestre: key,
        label: key !== null ? `${key}º Semestre` : 'Sem semestre definido',
        materias: map.get(key)!,
      })
    }

    return groups
  }, [materias])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Matérias</h1>
          <p className="text-muted-foreground">Gerencie suas disciplinas do semestre</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nova Matéria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMateria ? 'Editar Matéria' : 'Nova Matéria'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Matéria *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Anatomia" />
              </div>
              <div className="space-y-2">
                <Label>Professor (opcional)</Label>
                <Input value={professor} onChange={(e) => setProfessor(e.target.value)} placeholder="Nome do professor" />
              </div>
              <div className="space-y-2">
                <Label>Semestre *</Label>
                <Select value={semestre} onValueChange={setSemestre}>
                  <SelectTrigger><SelectValue placeholder="Selecione o semestre" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(s => (
                      <SelectItem key={s} value={String(s)}>{s}º Semestre</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: cor === c ? '#000' : 'transparent' }}
                      onClick={() => setCor(c)}
                    />
                  ))}
                </div>
                <Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-20 h-10" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingMateria ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {materias.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma matéria cadastrada ainda.<br />
              Adicione sua primeira matéria!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {materiasPorSemestre.map((group) => (
            <div key={group.semestre ?? 'none'}>
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold">{group.label}</h2>
                <Badge variant="secondary">{group.materias.length} matéria{group.materias.length !== 1 ? 's' : ''}</Badge>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.materias.map((materia) => (
                  <Card key={materia.id} className="overflow-hidden">
                    <div className="h-2" style={{ backgroundColor: materia.cor }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{materia.nome}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(materia)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(materia.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {materia.professor && (
                        <p className="text-muted-foreground">Prof. {materia.professor}</p>
                      )}
                      <div className="flex justify-between text-muted-foreground">
                        <span>{getAulasPorSemana(materia.id)} aulas/semana</span>
                        <span>Média: {getMediaMateria(materia.id).toFixed(1)}</span>
                      </div>
                      {getProximaProva(materia.id) && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Próxima prova: {getProximaProva(materia.id)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
