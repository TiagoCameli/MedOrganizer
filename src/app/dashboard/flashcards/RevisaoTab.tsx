'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMaterias } from '@/hooks/useMaterias'
import { useConteudos } from '@/hooks/useConteudos'
import { useSpacedRepetition, getNextIntervals } from '@/hooks/useSpacedRepetition'
import { StudyQuality } from '@/types'
import { renderClozeQuestion, renderClozeAnswer } from '@/lib/cloze'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Calendar, TrendingUp, BookOpen, Loader2, X, RotateCcw, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'

export default function RevisaoTab() {
  const { materias } = useMaterias()
  const { conteudos, fetchConteudosByMaterias } = useConteudos()
  const { dueCards, loading, reviewStats, fetchDueCards, submitReview, fetchReviewStats } = useSpacedRepetition()

  const [studyMode, setStudyMode] = useState(false)
  const [studyIndex, setStudyIndex] = useState(0)
  const [studyFlipped, setStudyFlipped] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Time tracking
  const cardShownAt = useRef<number>(Date.now())

  // Reset timer when card changes or flips
  useEffect(() => {
    if (studyMode) {
      cardShownAt.current = Date.now()
    }
  }, [studyIndex, studyMode])

  // Load stats and due cards on mount
  useEffect(() => {
    if (materias.length > 0 && !initialized) {
      const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
      fetchReviewStats(matData)
      fetchDueCards()
      fetchConteudosByMaterias(materias.map(m => m.id))
      setInitialized(true)
    }
  }, [materias, initialized, fetchReviewStats, fetchDueCards, fetchConteudosByMaterias])

  const totalDue = reviewStats.reduce((sum, s) => sum + s.due, 0)
  const totalLearned = reviewStats.reduce((sum, s) => sum + s.learned, 0)
  const totalCards = reviewStats.reduce((sum, s) => sum + s.total, 0)
  const avgRetention = totalCards > 0 ? Math.round((totalLearned / totalCards) * 100) : 0

  const getConteudoNome = (conteudoId: string | null) => {
    if (!conteudoId) return null
    return conteudos.find(c => c.id === conteudoId)?.nome || null
  }

  const getMateriaNome = (materiaId: string) => {
    return materias.find(m => m.id === materiaId)
  }

  const startReview = () => {
    if (dueCards.length === 0) return
    setStudyIndex(0)
    setStudyFlipped(false)
    setStudyMode(true)
    cardShownAt.current = Date.now()
  }

  const handleStudyQuality = useCallback(async (quality: StudyQuality) => {
    const currentCard = dueCards[Math.min(studyIndex, dueCards.length - 1)]
    if (!currentCard || submittingReview) return

    const timeTaken = Date.now() - cardShownAt.current

    setSubmittingReview(true)
    try {
      const result = await submitReview(currentCard, quality, timeTaken)
      const days = result.interval_days
      const label = days === 0 ? 'hoje' : days === 1 ? '1 dia' : `${days} dias`
      toast.success(`Próxima revisão em ${label}`)

      if (studyIndex < dueCards.length - 1) {
        setStudyFlipped(false)
        cardShownAt.current = Date.now()
      } else if (dueCards.length > 1) {
        setStudyIndex(0)
        setStudyFlipped(false)
        cardShownAt.current = Date.now()
      } else {
        toast.success('Todas as revisões de hoje concluídas!')
        setStudyMode(false)
        const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
        fetchReviewStats(matData)
      }
    } catch (error: unknown) {
      toast.error('Erro ao registrar revisão: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSubmittingReview(false)
  }, [dueCards, studyIndex, submittingReview, submitReview, materias, fetchReviewStats])

  // Keyboard shortcuts (1=Errei, 2=Difícil, 3=Bom, 4=Fácil, Space=Flip)
  useEffect(() => {
    if (!studyMode) return

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!studyFlipped) {
          setStudyFlipped(true)
        }
        return
      }

      if (!studyFlipped) return

      if (e.key === '1') handleStudyQuality(1)
      else if (e.key === '2') handleStudyQuality(2)
      else if (e.key === '3') handleStudyQuality(3)
      else if (e.key === '4') handleStudyQuality(4)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [studyMode, studyFlipped, handleStudyQuality])

  // Queue counts
  const newCount = dueCards.filter(c => c.status === 'new').length
  const learningCount = dueCards.filter(c => c.status === 'learning' || c.status === 'relearning').length
  const reviewCount = dueCards.filter(c => c.status === 'review').length

  // Study mode view
  if (studyMode && dueCards.length > 0) {
    const currentCard = dueCards[Math.min(studyIndex, dueCards.length - 1)]
    const conteudoNome = getConteudoNome(currentCard.conteudo_id)
    const cardMateria = getMateriaNome(currentCard.materia_id)
    const previews = getNextIntervals(currentCard)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Revisão Espaçada</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-blue-600 font-medium">{newCount} novas</span>
              <span className="text-sm text-amber-600 font-medium">{learningCount} aprendendo</span>
              <span className="text-sm text-green-600 font-medium">{reviewCount} revisão</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => {
            setStudyMode(false)
            const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
            fetchReviewStats(matData)
            fetchDueCards()
          }}>
            <X className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full bg-indigo-600 transition-all"
            style={{ width: `${((studyIndex + 1) / (dueCards.length + studyIndex)) * 100}%` }}
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
                  <Badge style={{ backgroundColor: cardMateria.cor, color: '#fff' }}>
                    {cardMateria.nome}
                  </Badge>
                )}
                {conteudoNome && (
                  <Badge variant="outline">{conteudoNome}</Badge>
                )}
                {currentCard.type === 'basico_invertido' && currentCard.card_index === 1 && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">Invertido</Badge>
                )}
                {currentCard.type === 'cloze' && (
                  <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600">Omissão</Badge>
                )}
              </div>
              <p className="text-xl font-medium whitespace-pre-wrap">
                {currentCard.type === 'cloze'
                  ? (studyFlipped
                      ? renderClozeAnswer(currentCard.pergunta)
                      : renderClozeQuestion(currentCard.pergunta))
                  : (studyFlipped ? currentCard.resposta : currentCard.pergunta)
                }
              </p>
              {!studyFlipped && (
                <p className="text-sm text-muted-foreground mt-6">
                  Clique ou pressione Espaço para ver a resposta
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Answer buttons */}
        <div className="flex justify-center gap-3">
          {!studyFlipped ? (
            <Button variant="outline" onClick={() => setStudyFlipped(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Virar
            </Button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-2xl">
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex-col h-auto py-3"
                onClick={() => handleStudyQuality(1)}
                disabled={submittingReview}
              >
                <span className="font-medium">Errei</span>
                <span className="text-xs opacity-70">{previews.again}</span>
                <span className="text-[10px] opacity-50">1</span>
              </Button>
              <Button
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 flex-col h-auto py-3"
                onClick={() => handleStudyQuality(2)}
                disabled={submittingReview}
              >
                <span className="font-medium">Difícil</span>
                <span className="text-xs opacity-70">{previews.hard}</span>
                <span className="text-[10px] opacity-50">2</span>
              </Button>
              <Button
                variant="outline"
                className="border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 flex-col h-auto py-3"
                onClick={() => handleStudyQuality(3)}
                disabled={submittingReview}
              >
                <span className="font-medium">Bom</span>
                <span className="text-xs opacity-70">{previews.good}</span>
                <span className="text-[10px] opacity-50">3</span>
              </Button>
              <Button
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 flex-col h-auto py-3"
                onClick={() => handleStudyQuality(4)}
                disabled={submittingReview}
              >
                <span className="font-medium">Fácil</span>
                <span className="text-xs opacity-70">{previews.easy}</span>
                <span className="text-[10px] opacity-50">4</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revisão Espaçada</h1>
          <p className="text-muted-foreground">Acompanhe e revise seus flashcards com repetição espaçada</p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={startReview}
          disabled={loading || totalDue === 0}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Brain className="mr-2 h-4 w-4" />
          )}
          Começar Revisão ({totalDue})
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDue}</p>
                <p className="text-sm text-muted-foreground">Cards para hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRetention}%</p>
                <p className="text-sm text-muted-foreground">Taxa de retenção</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLearned}</p>
                <p className="text-sm text-muted-foreground">Cards aprendidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No due cards message */}
      {!loading && totalDue === 0 && totalCards > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PartyPopper className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Tudo em dia!</p>
            <p className="text-muted-foreground text-sm text-center mt-1">
              Nenhum card pendente para revisão. Volte amanhã!
            </p>
          </CardContent>
        </Card>
      )}

      {/* No cards at all */}
      {!loading && totalCards === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum flashcard encontrado.<br />
              Crie flashcards na aba &quot;Flashcards&quot; para começar a revisar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats table per materia */}
      {reviewStats.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Matéria</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Pendentes</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Aprendidos</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Novos</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Retenção</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Intervalo</th>
                    <th className="p-3 text-sm font-medium text-muted-foreground min-w-[120px]">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewStats.map(stat => (
                    <tr key={stat.materia_id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: stat.materia_cor }} />
                          <span className="text-sm font-medium">{stat.materia_nome}</span>
                        </div>
                      </td>
                      <td className="text-center p-3 text-sm">{stat.total}</td>
                      <td className="text-center p-3">
                        <Badge variant={stat.due > 0 ? 'destructive' : 'secondary'} className="text-xs">
                          {stat.due}
                        </Badge>
                      </td>
                      <td className="text-center p-3 text-sm text-green-600">{stat.learned}</td>
                      <td className="text-center p-3 text-sm text-muted-foreground">{stat.new_cards}</td>
                      <td className="text-center p-3 text-sm">{stat.retention_rate}%</td>
                      <td className="text-center p-3 text-sm text-muted-foreground">{stat.avg_interval}d</td>
                      <td className="p-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${stat.retention_rate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      )}
    </div>
  )
}
