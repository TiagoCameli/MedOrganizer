'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useMaterias } from '@/hooks/useMaterias'
import { Flashcard } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Brain, Plus, Pencil, Trash2, RotateCcw, ChevronRight, Loader2, X, Filter } from 'lucide-react'
import { toast } from 'sonner'

export default function FlashcardsPage() {
  const { flashcards, loading, fetchFlashcards, addFlashcard, updateFlashcard, deleteFlashcard } = useFlashcards()
  const { materias, loading: loadingMaterias } = useMaterias()

  const [selectedSemestres, setSelectedSemestres] = useState<Set<number>>(new Set())
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null)
  const [saving, setSaving] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())

  // Form state
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState('')

  // Study mode state
  const [studyMode, setStudyMode] = useState(false)
  const [studyIndex, setStudyIndex] = useState(0)
  const [studyFlipped, setStudyFlipped] = useState(false)

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

  // Fetch flashcards when materia changes
  useEffect(() => {
    if (selectedMateria) {
      fetchFlashcards(selectedMateria)
      setFlippedCards(new Set())
    }
  }, [selectedMateria, fetchFlashcards])

  const resetForm = () => {
    setPergunta('')
    setResposta('')
    setEditingFlashcard(null)
  }

  const openEdit = (flashcard: Flashcard) => {
    setEditingFlashcard(flashcard)
    setPergunta(flashcard.pergunta)
    setResposta(flashcard.resposta)
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
      const data = { pergunta, resposta, materia_id: selectedMateria }
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

  const enterStudyMode = () => {
    if (flashcards.length === 0) {
      toast.error('Nenhum flashcard para estudar')
      return
    }
    setStudyIndex(0)
    setStudyFlipped(false)
    setStudyMode(true)
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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Modo Estudo</h1>
            <p className="text-muted-foreground">
              {selectedMateriaObj?.nome} — Card {studyIndex + 1} de {flashcards.length}
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
              <Badge variant="secondary" className="mb-4">
                {studyFlipped ? 'Resposta' : 'Pergunta'}
              </Badge>
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
          {selectedMateria && flashcards.length > 0 && (
            <Button variant="outline" onClick={enterStudyMode}>
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

        <Tabs value={selectedMateria} onValueChange={setSelectedMateria}>
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
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : flashcards.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Brain className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm text-center">
                      Nenhum flashcard para {materia.nome}.<br />
                      Crie seu primeiro flashcard!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {flashcards.map((flashcard) => (
                    <Card
                      key={flashcard.id}
                      className="cursor-pointer hover:border-indigo-300 transition-colors overflow-hidden"
                      onClick={() => toggleFlip(flashcard.id)}
                    >
                      <div className="h-1.5" style={{ backgroundColor: materia.cor }} />
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {flippedCards.has(flashcard.id) ? 'Resposta' : 'Pergunta'}
                          </Badge>
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
                  ))}
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
