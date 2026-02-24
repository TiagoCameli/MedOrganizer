'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useMaterias } from '@/hooks/useMaterias'
import { useConteudos } from '@/hooks/useConteudos'
import { Flashcard, Conteudo } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Brain, Plus, Pencil, Trash2, RotateCcw, ChevronRight, ChevronLeft, Loader2, X, Filter, Check } from 'lucide-react'
import { toast } from 'sonner'

export default function FlashcardsPage() {
  const { flashcards, loading, fetchFlashcards, fetchStudyFlashcards, addFlashcard, updateFlashcard, deleteFlashcard } = useFlashcards()
  const { materias, loading: loadingMaterias } = useMaterias()
  const { conteudos, fetchConteudos, fetchConteudosByMaterias, addConteudo, deleteConteudo } = useConteudos()

  const [selectedSemestres, setSelectedSemestres] = useState<Set<number>>(new Set())
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [selectedConteudo, setSelectedConteudo] = useState<string>('') // '' = Todos
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null)
  const [saving, setSaving] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())

  // Form state
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState('')
  const [formConteudoId, setFormConteudoId] = useState<string>('none')

  // New conteudo popover state
  const [newConteudoOpen, setNewConteudoOpen] = useState(false)
  const [newConteudoNome, setNewConteudoNome] = useState('')
  const [savingConteudo, setSavingConteudo] = useState(false)

  // Study mode state
  const [studyMode, setStudyMode] = useState(false)
  const [studyIndex, setStudyIndex] = useState(0)
  const [studyFlipped, setStudyFlipped] = useState(false)

  // Study wizard state
  const [studyWizardOpen, setStudyWizardOpen] = useState(false)
  const [studyStep, setStudyStep] = useState<1 | 2 | 3>(1)
  const [studySemestres, setStudySemestres] = useState<Set<number>>(new Set())
  const [studyMaterias, setStudyMaterias] = useState<Set<string>>(new Set())
  const [studyConteudosList, setStudyConteudosList] = useState<Conteudo[]>([])
  const [studyAllConteudos, setStudyAllConteudos] = useState(true)
  const [studyConteudos, setStudyConteudos] = useState<Set<string>>(new Set())
  const [studyLoading, setStudyLoading] = useState(false)
  // Names of materias selected for study (for display in study mode)
  const [studyMateriaNames, setStudyMateriaNames] = useState<{ id: string; nome: string; cor: string }[]>([])

  // Available semesters from materias
  const semestresDisponiveis = useMemo(() => {
    const set = new Set<number>()
    for (const m of materias) {
      if (m.semestre != null) set.add(m.semestre)
    }
    return [...set].sort((a, b) => a - b)
  }, [materias])

  // Filtered materias by selected semesters
  const materiasFiltradas = useMemo(() => {
    if (selectedSemestres.size === 0) return materias
    return materias.filter(m => m.semestre != null && selectedSemestres.has(m.semestre))
  }, [materias, selectedSemestres])

  // Wizard: materias filtered by wizard-selected semesters
  const wizardMaterias = useMemo(() => {
    if (studySemestres.size === 0) return []
    return materias.filter(m => m.semestre != null && studySemestres.has(m.semestre))
  }, [materias, studySemestres])

  // Wizard: conteudos grouped by materia
  const wizardConteudosGrouped = useMemo(() => {
    const groups: { materiaId: string; materiaNome: string; materiaCor: string; conteudos: Conteudo[] }[] = []
    const materiaMap = new Map(materias.map(m => [m.id, m]))
    const byMateria = new Map<string, Conteudo[]>()
    for (const c of studyConteudosList) {
      if (!byMateria.has(c.materia_id)) byMateria.set(c.materia_id, [])
      byMateria.get(c.materia_id)!.push(c)
    }
    for (const [materiaId, conts] of byMateria) {
      const mat = materiaMap.get(materiaId)
      if (mat) {
        groups.push({ materiaId, materiaNome: mat.nome, materiaCor: mat.cor, conteudos: conts })
      }
    }
    groups.sort((a, b) => a.materiaNome.localeCompare(b.materiaNome))
    return groups
  }, [studyConteudosList, materias])

  const toggleSemestre = (sem: number) => {
    setSelectedSemestres(prev => {
      const next = new Set(prev)
      if (next.has(sem)) {
        next.delete(sem)
      } else {
        next.add(sem)
      }
      return next
    })
  }

  // Select first materia from filtered list when filter changes or on load
  useEffect(() => {
    if (materiasFiltradas.length > 0) {
      const currentStillVisible = materiasFiltradas.some(m => m.id === selectedMateria)
      if (!currentStillVisible) {
        setSelectedMateria(materiasFiltradas[0].id)
      }
    }
  }, [materiasFiltradas, selectedMateria])

  // Fetch conteúdos when materia changes
  useEffect(() => {
    if (selectedMateria) {
      fetchConteudos(selectedMateria)
      setSelectedConteudo('')
    }
  }, [selectedMateria, fetchConteudos])

  // Fetch flashcards when materia or conteudo filter changes
  useEffect(() => {
    if (selectedMateria) {
      fetchFlashcards(selectedMateria, selectedConteudo || undefined)
      setFlippedCards(new Set())
    }
  }, [selectedMateria, selectedConteudo, fetchFlashcards])

  const resetForm = () => {
    setPergunta('')
    setResposta('')
    setFormConteudoId('none')
    setEditingFlashcard(null)
  }

  const openEdit = (flashcard: Flashcard) => {
    setEditingFlashcard(flashcard)
    setPergunta(flashcard.pergunta)
    setResposta(flashcard.resposta)
    setFormConteudoId(flashcard.conteudo_id || 'none')
    setDialogOpen(true)
  }

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!pergunta.trim()) { toast.error('Pergunta é obrigatória'); return }
    if (!resposta.trim()) { toast.error('Resposta é obrigatória'); return }
    if (!selectedMateria) { toast.error('Selecione uma matéria'); return }

    setSaving(true)
    try {
      const data = {
        pergunta,
        resposta,
        materia_id: selectedMateria,
        conteudo_id: formConteudoId === 'none' ? null : formConteudoId,
      }
      if (editingFlashcard) {
        await updateFlashcard(editingFlashcard.id, data)
        toast.success('Flashcard atualizado!')
      } else {
        await addFlashcard(data)
        toast.success('Flashcard criado!')
      }
      setDialogOpen(false)
      resetForm()
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este flashcard?')) return
    try {
      await deleteFlashcard(id)
      toast.success('Flashcard excluído!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const handleAddConteudo = async () => {
    if (!newConteudoNome.trim()) return
    setSavingConteudo(true)
    try {
      await addConteudo({ materia_id: selectedMateria, nome: newConteudoNome.trim() })
      setNewConteudoNome('')
      setNewConteudoOpen(false)
      toast.success('Conteúdo criado!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSavingConteudo(false)
  }

  const handleDeleteConteudo = async (id: string, nome: string) => {
    if (!confirm(`Excluir o conteúdo "${nome}"? Os flashcards associados ficarão sem conteúdo.`)) return
    try {
      await deleteConteudo(id)
      if (selectedConteudo === id) setSelectedConteudo('')
      toast.success('Conteúdo excluído!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  // --- Study Wizard ---
  const openStudyWizard = () => {
    setStudySemestres(new Set())
    setStudyMaterias(new Set())
    setStudyConteudosList([])
    setStudyAllConteudos(true)
    setStudyConteudos(new Set())
    setStudyStep(1)
    setStudyWizardOpen(true)
  }

  const toggleStudySemestre = (sem: number) => {
    setStudySemestres(prev => {
      const next = new Set(prev)
      if (next.has(sem)) next.delete(sem)
      else next.add(sem)
      return next
    })
  }

  const toggleStudyMateria = (id: string) => {
    setStudyMaterias(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllStudyMaterias = () => {
    if (studyMaterias.size === wizardMaterias.length) {
      setStudyMaterias(new Set())
    } else {
      setStudyMaterias(new Set(wizardMaterias.map(m => m.id)))
    }
  }

  const toggleStudyConteudo = (id: string) => {
    setStudyConteudos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const wizardNext = async () => {
    if (studyStep === 1) {
      // Reset materia selection when going to step 2 (semesters may have changed)
      setStudyMaterias(new Set())
      setStudyStep(2)
    } else if (studyStep === 2) {
      // Fetch conteudos for selected materias
      setStudyLoading(true)
      const ids = [...studyMaterias]
      const data = await fetchConteudosByMaterias(ids)
      setStudyConteudosList(data)
      setStudyAllConteudos(true)
      setStudyConteudos(new Set())
      setStudyLoading(false)
      setStudyStep(3)
    }
  }

  const wizardBack = () => {
    if (studyStep === 2) setStudyStep(1)
    else if (studyStep === 3) setStudyStep(2)
  }

  const wizardStart = async () => {
    setStudyLoading(true)
    const materiaIds = [...studyMaterias]
    const conteudoIds = studyAllConteudos ? undefined : [...studyConteudos]
    const data = await fetchStudyFlashcards(materiaIds, conteudoIds)

    if (!data || data.length === 0) {
      toast.error('Nenhum flashcard encontrado para a seleção')
      setStudyLoading(false)
      return
    }

    // Store materia info for study mode display
    setStudyMateriaNames(
      materias
        .filter(m => studyMaterias.has(m.id))
        .map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
    )

    setStudyWizardOpen(false)
    setStudyIndex(0)
    setStudyFlipped(false)
    setStudyMode(true)
    setStudyLoading(false)
  }

  const nextStudyCard = () => {
    if (studyIndex < flashcards.length - 1) {
      setStudyIndex(prev => prev + 1)
      setStudyFlipped(false)
    } else {
      toast.success('Você revisou todos os flashcards!')
      setStudyMode(false)
    }
  }

  const selectedMateriaObj = materias.find(m => m.id === selectedMateria)
  const getConteudoNome = (conteudoId: string | null) => {
    if (!conteudoId) return null
    // Check both regular conteudos and study conteudos list
    const found = conteudos.find(c => c.id === conteudoId) || studyConteudosList.find(c => c.id === conteudoId)
    return found?.nome || null
  }

  const getStudyMateriaNome = (materiaId: string) => {
    return studyMateriaNames.find(m => m.id === materiaId)
  }

  if (loadingMaterias) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // Study mode view
  if (studyMode && flashcards.length > 0) {
    const currentCard = flashcards[studyIndex]
    const conteudoNome = getConteudoNome(currentCard.conteudo_id)
    const cardMateria = getStudyMateriaNome(currentCard.materia_id)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Modo Estudo</h1>
            <p className="text-muted-foreground">
              {studyMateriaNames.map(m => m.nome).join(', ')}
              {' — '}Card {studyIndex + 1} de {flashcards.length}
            </p>
          </div>
          <Button variant="outline" onClick={() => setStudyMode(false)}>
            <X className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full bg-indigo-600 transition-all"
            style={{ width: `${((studyIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => setStudyFlipped(!studyFlipped)}
        >
          <Card className="min-h-[300px] flex items-center justify-center border-2 hover:border-indigo-300 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="flex gap-2 mb-4 flex-wrap justify-center">
                <Badge variant="secondary">
                  {studyFlipped ? 'Resposta' : 'Pergunta'}
                </Badge>
                {cardMateria && (
                  <Badge
                    style={{ backgroundColor: cardMateria.cor, color: '#fff' }}
                  >
                    {cardMateria.nome}
                  </Badge>
                )}
                {conteudoNome && (
                  <Badge variant="outline">{conteudoNome}</Badge>
                )}
              </div>
              <p className="text-xl font-medium whitespace-pre-wrap">
                {studyFlipped ? currentCard.resposta : currentCard.pergunta}
              </p>
              {!studyFlipped && (
                <p className="text-sm text-muted-foreground mt-6">
                  Clique para ver a resposta
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setStudyFlipped(!studyFlipped)}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Virar
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={nextStudyCard}
          >
            {studyIndex < flashcards.length - 1 ? (
              <>Próximo <ChevronRight className="ml-2 h-4 w-4" /></>
            ) : (
              'Finalizar'
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Flashcards</h1>
          <p className="text-muted-foreground">Crie e estude seus flashcards por matéria</p>
        </div>
        <div className="flex gap-2">
          {materias.length > 0 && (
            <Button variant="outline" onClick={openStudyWizard}>
              <Brain className="mr-2 h-4 w-4" /> Modo Estudo
            </Button>
          )}
          {selectedMateria && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Novo Flashcard
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingFlashcard ? 'Editar Flashcard' : 'Novo Flashcard'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Conteúdo</Label>
                    <Select value={formConteudoId} onValueChange={setFormConteudoId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um conteúdo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {conteudos.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pergunta *</Label>
                    <Textarea
                      value={pergunta}
                      onChange={(e) => setPergunta(e.target.value)}
                      placeholder="Digite a pergunta..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resposta *</Label>
                    <Textarea
                      value={resposta}
                      onChange={(e) => setResposta(e.target.value)}
                      placeholder="Digite a resposta..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingFlashcard ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Study Wizard Dialog */}
      <Dialog open={studyWizardOpen} onOpenChange={setStudyWizardOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Modo Estudo</span>
              <span className="text-sm font-normal text-muted-foreground">
                Etapa {studyStep} de 3
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= studyStep ? 'bg-indigo-600' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Semestres */}
          {studyStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Selecione os semestres</Label>
                <p className="text-xs text-muted-foreground mt-1">Escolha um ou mais semestres para estudar</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {semestresDisponiveis.map(sem => (
                  <button
                    key={sem}
                    onClick={() => toggleStudySemestre(sem)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      studySemestres.has(sem)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-background text-foreground border-border hover:border-indigo-300'
                    }`}
                  >
                    {sem}º Semestre
                  </button>
                ))}
              </div>
              {semestresDisponiveis.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum semestre disponível. Configure semestres nas matérias.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Matérias */}
          {studyStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Selecione as matérias</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {wizardMaterias.length} matéria{wizardMaterias.length !== 1 ? 's' : ''} encontrada{wizardMaterias.length !== 1 ? 's' : ''}
                </p>
              </div>

              {wizardMaterias.length > 1 && (
                <button
                  onClick={toggleAllStudyMaterias}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-colors text-sm font-medium ${
                    studyMaterias.size === wizardMaterias.length
                      ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                      : 'border-border hover:border-indigo-300'
                  }`}
                >
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    studyMaterias.size === wizardMaterias.length
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-muted-foreground'
                  }`}>
                    {studyMaterias.size === wizardMaterias.length && <Check className="h-3 w-3 text-white" />}
                  </div>
                  Selecionar Todos
                </button>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {wizardMaterias.map(mat => (
                  <button
                    key={mat.id}
                    onClick={() => toggleStudyMateria(mat.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
                      studyMaterias.has(mat.id)
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                        : 'border-border hover:border-indigo-300'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      studyMaterias.has(mat.id)
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-muted-foreground'
                    }`}>
                      {studyMaterias.has(mat.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: mat.cor }}
                    />
                    <span className="text-left">{mat.nome}</span>
                    {mat.semestre != null && (
                      <span className="text-xs text-muted-foreground ml-auto">{mat.semestre}º sem</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Conteúdos */}
          {studyStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Selecione os conteúdos</Label>
                <p className="text-xs text-muted-foreground mt-1">Estude todos ou selecione conteúdos específicos</p>
              </div>

              {studyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <>
                  {/* Toggle all */}
                  <button
                    onClick={() => {
                      setStudyAllConteudos(!studyAllConteudos)
                      if (!studyAllConteudos) setStudyConteudos(new Set())
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-colors text-sm font-medium ${
                      studyAllConteudos
                        ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                        : 'border-border hover:border-indigo-300'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      studyAllConteudos
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-muted-foreground'
                    }`}>
                      {studyAllConteudos && <Check className="h-3 w-3 text-white" />}
                    </div>
                    Todos os conteúdos
                  </button>

                  {!studyAllConteudos && (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {wizardConteudosGrouped.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum conteúdo cadastrado para as matérias selecionadas.
                        </p>
                      ) : (
                        wizardConteudosGrouped.map(group => (
                          <div key={group.materiaId}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: group.materiaCor }}
                              />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {group.materiaNome}
                              </span>
                            </div>
                            <div className="space-y-1 ml-4">
                              {group.conteudos.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => toggleStudyConteudo(c.id)}
                                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                                    studyConteudos.has(c.id)
                                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                                      : 'border-border hover:border-indigo-300'
                                  }`}
                                >
                                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                    studyConteudos.has(c.id)
                                      ? 'bg-indigo-600 border-indigo-600'
                                      : 'border-muted-foreground'
                                  }`}>
                                    {studyConteudos.has(c.id) && <Check className="h-2.5 w-2.5 text-white" />}
                                  </div>
                                  {c.nome}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Wizard navigation */}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={studyStep === 1 ? () => setStudyWizardOpen(false) : wizardBack}
            >
              {studyStep === 1 ? (
                'Cancelar'
              ) : (
                <><ChevronLeft className="mr-1 h-4 w-4" /> Voltar</>
              )}
            </Button>

            {studyStep < 3 ? (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={
                  (studyStep === 1 && studySemestres.size === 0) ||
                  (studyStep === 2 && studyMaterias.size === 0)
                }
                onClick={wizardNext}
              >
                Próximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={studyLoading || (!studyAllConteudos && studyConteudos.size === 0)}
                onClick={wizardStart}
              >
                {studyLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                Começar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {materias.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma matéria cadastrada.<br />
              Adicione matérias primeiro para criar flashcards.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtro de semestres */}
          {semestresDisponiveis.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Semestre:</span>
              {semestresDisponiveis.map((sem) => (
                <button
                  key={sem}
                  onClick={() => toggleSemestre(sem)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedSemestres.has(sem)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-background text-muted-foreground border-border hover:border-indigo-300'
                  }`}
                >
                  {sem}º
                </button>
              ))}
              {selectedSemestres.size > 0 && (
                <button
                  onClick={() => setSelectedSemestres(new Set())}
                  className="px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          )}

        <Tabs value={selectedMateria} onValueChange={(val) => { setSelectedMateria(val); setSelectedConteudo('') }}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {materiasFiltradas.map((materia) => (
              <TabsTrigger
                key={materia.id}
                value={materia.id}
                className="data-[state=active]:text-white"
                style={{
                  backgroundColor: selectedMateria === materia.id ? materia.cor : undefined,
                  borderColor: materia.cor,
                }}
              >
                {materia.nome}
              </TabsTrigger>
            ))}
          </TabsList>

          {materiasFiltradas.map((materia) => (
            <TabsContent key={materia.id} value={materia.id}>
              {/* Chips de conteúdo */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="text-sm text-muted-foreground">Conteúdo:</span>
                <button
                  onClick={() => setSelectedConteudo('')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedConteudo === ''
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-background text-muted-foreground border-border hover:border-indigo-300'
                  }`}
                >
                  Todos
                </button>
                {conteudos.map((conteudo) => (
                  <div key={conteudo.id} className="flex items-center group">
                    <button
                      onClick={() => setSelectedConteudo(conteudo.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedConteudo === conteudo.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-background text-muted-foreground border-border hover:border-indigo-300'
                      }`}
                    >
                      {conteudo.nome}
                    </button>
                    <button
                      onClick={() => handleDeleteConteudo(conteudo.id, conteudo.nome)}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      title="Excluir conteúdo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Popover open={newConteudoOpen} onOpenChange={setNewConteudoOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="px-2 py-1 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      title="Novo conteúdo"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-2">
                      <Label className="text-xs">Novo conteúdo</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newConteudoNome}
                          onChange={(e) => setNewConteudoNome(e.target.value)}
                          placeholder="Ex: Sistema Nervoso"
                          className="h-8 text-sm"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddConteudo() }}
                        />
                        <Button
                          size="sm"
                          className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={handleAddConteudo}
                          disabled={savingConteudo || !newConteudoNome.trim()}
                        >
                          {savingConteudo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : flashcards.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Brain className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm text-center">
                      {selectedConteudo
                        ? <>Nenhum flashcard para este conteúdo.<br />Crie seu primeiro flashcard!</>
                        : <>Nenhum flashcard para {materia.nome}.<br />Crie seu primeiro flashcard!</>
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {flashcards.map((flashcard) => {
                    const conteudoNome = getConteudoNome(flashcard.conteudo_id)
                    return (
                      <Card
                        key={flashcard.id}
                        className="cursor-pointer hover:border-indigo-300 transition-colors overflow-hidden"
                        onClick={() => toggleFlip(flashcard.id)}
                      >
                        <div className="h-1.5" style={{ backgroundColor: materia.cor }} />
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {flippedCards.has(flashcard.id) ? 'Resposta' : 'Pergunta'}
                              </Badge>
                              {conteudoNome && (
                                <Badge variant="outline" className="text-xs">
                                  {conteudoNome}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(flashcard)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(flashcard.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap min-h-[60px]">
                            {flippedCards.has(flashcard.id) ? flashcard.resposta : flashcard.pergunta}
                          </p>
                          {!flippedCards.has(flashcard.id) && (
                            <p className="text-xs text-muted-foreground mt-3">
                              Clique para ver a resposta
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        </>
      )}
    </div>
  )
}
