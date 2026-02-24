'use client'

import { useState, useEffect } from 'react'
import { useMaterias } from '@/hooks/useMaterias'
import { useConteudos } from '@/hooks/useConteudos'
import { useWeaknessTracker } from '@/hooks/useWeaknessTracker'
import { WeaknessTopic } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, Lightbulb, Star } from 'lucide-react'
import { toast } from 'sonner'

export default function PontosFracosTab() {
  const { materias } = useMaterias()
  const { conteudos, fetchConteudosByMaterias } = useConteudos()
  const {
    weaknesses,
    computedWeaknesses,
    loading,
    fetchWeaknesses,
    addWeakness,
    updateWeakness,
    deleteWeakness,
    fetchComputedWeaknesses,
    getWeeklyReviewSuggestion,
  } = useWeaknessTracker()

  const [initialized, setInitialized] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWeakness, setEditingWeakness] = useState<WeaknessTopic | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formMateriaId, setFormMateriaId] = useState<string>('')
  const [formConteudoId, setFormConteudoId] = useState<string>('none')
  const [formDifficulty, setFormDifficulty] = useState(3)
  const [formNotes, setFormNotes] = useState('')
  const [formConteudoOptions, setFormConteudoOptions] = useState<{ id: string; nome: string }[]>([])

  // Load data on mount
  useEffect(() => {
    if (materias.length > 0 && !initialized) {
      fetchWeaknesses()
      const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
      fetchConteudosByMaterias(materias.map(m => m.id)).then(allConteudos => {
        const contData = allConteudos.map(c => ({ id: c.id, nome: c.nome, materia_id: c.materia_id }))
        fetchComputedWeaknesses(matData, contData)
      })
      setInitialized(true)
    }
  }, [materias, initialized, fetchWeaknesses, fetchComputedWeaknesses, fetchConteudosByMaterias])

  // Update conteudo options when materia changes in form
  useEffect(() => {
    if (formMateriaId) {
      const filtered = conteudos.filter(c => c.materia_id === formMateriaId)
      setFormConteudoOptions(filtered)
    } else {
      setFormConteudoOptions([])
    }
  }, [formMateriaId, conteudos])

  const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
  const contData = conteudos.map(c => ({ id: c.id, nome: c.nome, materia_id: c.materia_id }))
  const suggestion = getWeeklyReviewSuggestion(computedWeaknesses, weaknesses, matData, contData)

  const resetForm = () => {
    setFormMateriaId('')
    setFormConteudoId('none')
    setFormDifficulty(3)
    setFormNotes('')
    setEditingWeakness(null)
  }

  const openNew = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (w: WeaknessTopic) => {
    setEditingWeakness(w)
    setFormMateriaId(w.materia_id)
    setFormConteudoId(w.conteudo_id || 'none')
    setFormDifficulty(w.difficulty)
    setFormNotes(w.notes || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formMateriaId) { toast.error('Selecione uma matéria'); return }

    setSaving(true)
    try {
      const data = {
        materia_id: formMateriaId,
        conteudo_id: formConteudoId === 'none' ? null : formConteudoId,
        difficulty: formDifficulty,
        notes: formNotes.trim() || null,
      }
      if (editingWeakness) {
        await updateWeakness(editingWeakness.id, data)
        toast.success('Ponto fraco atualizado!')
      } else {
        await addWeakness(data)
        toast.success('Ponto fraco adicionado!')
      }
      setDialogOpen(false)
      resetForm()
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este ponto fraco?')) return
    try {
      await deleteWeakness(id)
      toast.success('Ponto fraco excluído!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const getMateria = (materiaId: string) => materias.find(m => m.id === materiaId)
  const getConteudoNome = (conteudoId: string | null) => {
    if (!conteudoId) return null
    return conteudos.find(c => c.id === conteudoId)?.nome || null
  }

  const hasSuggestions = suggestion.topComputed.length > 0 || suggestion.topManual.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pontos Fracos</h1>
          <p className="text-muted-foreground">Identifique e acompanhe seus pontos fracos</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Ponto Fraco
        </Button>
      </div>

      {/* Weekly suggestion */}
      {hasSuggestions && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold">O que revisar esta semana</h2>
            </div>
            <div className="space-y-2">
              {suggestion.topComputed.map((item, i) => (
                <div key={`computed-${i}`} className="flex items-center gap-2 text-sm">
                  <Badge
                    className="text-xs"
                    style={{ backgroundColor: item.materia_cor, color: '#fff' }}
                  >
                    {item.materia_nome}
                  </Badge>
                  <span>{item.conteudo_nome}</span>
                  <span className="text-red-500 ml-auto text-xs">{item.error_rate}% erros</span>
                </div>
              ))}
              {suggestion.topManual.map((item, i) => (
                <div key={`manual-${i}`} className="flex items-center gap-2 text-sm">
                  <Badge
                    className="text-xs"
                    style={{ backgroundColor: item.materia_cor, color: '#fff' }}
                  >
                    {item.materia_nome}
                  </Badge>
                  <span>{item.conteudo_nome || '(Geral)'}</span>
                  <div className="flex ml-auto">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${s < item.difficulty ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Computed weaknesses - left */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Ranking de Erros
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : computedWeaknesses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm text-center">
                  Nenhuma revisão registrada ainda.<br />
                  Revise flashcards para ver o ranking de erros.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Conteúdo</th>
                        <th className="text-center p-3 text-xs font-medium text-muted-foreground">Reviews</th>
                        <th className="text-center p-3 text-xs font-medium text-muted-foreground">Erros</th>
                        <th className="text-center p-3 text-xs font-medium text-muted-foreground">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedWeaknesses.map((item, i) => (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="p-3">
                            <div className="space-y-1">
                              <span className="text-sm">{item.conteudo_nome}</span>
                              <div>
                                <Badge
                                  className="text-[10px]"
                                  style={{ backgroundColor: item.materia_cor, color: '#fff' }}
                                >
                                  {item.materia_nome}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="text-center p-3 text-sm">{item.total_reviews}</td>
                          <td className="text-center p-3 text-sm text-red-500">{item.errors}</td>
                          <td className="text-center p-3">
                            <Badge
                              variant={item.error_rate >= 50 ? 'destructive' : item.error_rate >= 25 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {item.error_rate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Manual weaknesses - right */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Pontos Fracos Manuais
          </h2>
          {weaknesses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm text-center">
                  Nenhum ponto fraco adicionado.<br />
                  Adicione temas que precisa reforçar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {weaknesses.map(w => {
                const mat = getMateria(w.materia_id)
                const contNome = getConteudoNome(w.conteudo_id)
                return (
                  <Card key={w.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          {mat && (
                            <Badge
                              className="text-xs"
                              style={{ backgroundColor: mat.cor, color: '#fff' }}
                            >
                              {mat.nome}
                            </Badge>
                          )}
                          {contNome && (
                            <p className="text-sm font-medium">{contNome}</p>
                          )}
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < w.difficulty ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                          {w.notes && (
                            <p className="text-xs text-muted-foreground">{w.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(w.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog for add/edit weakness */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWeakness ? 'Editar Ponto Fraco' : 'Novo Ponto Fraco'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Matéria *</Label>
              <Select value={formMateriaId} onValueChange={(val) => { setFormMateriaId(val); setFormConteudoId('none') }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma matéria" />
                </SelectTrigger>
                <SelectContent>
                  {materias.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.cor }} />
                        {m.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo (opcional)</Label>
              <Select value={formConteudoId} onValueChange={setFormConteudoId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um conteúdo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (geral)</SelectItem>
                  {formConteudoOptions.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nível de dificuldade</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setFormDifficulty(level)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${level <= formDifficulty ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Anotações sobre o ponto fraco..."
                rows={3}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingWeakness ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
