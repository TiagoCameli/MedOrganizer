'use client'

import { useState, useEffect } from 'react'
import { useMaterias } from '@/hooks/useMaterias'
import { useConteudos } from '@/hooks/useConteudos'
import { useSpacedRepetition, calculateSM2 } from '@/hooks/useSpacedRepetition'
import { Flashcard } from '@/types'
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

  // Load stats and due cards on mount
  useEffect(() => {
    if (materias.length > 0 && !initialized) {
      const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
      fetchReviewStats(matData)
      fetchDueCards()
      setInitialized(true)
    }
  }, [materias, initialized, fetchReviewStats, fetchDueCards])

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
  }

  const handleStudyQuality = async (quality: 0 | 3 | 5) => {
    const currentCard = dueCards[studyIndex]
    if (!currentCard || submittingReview) return

    setSubmittingReview(true)
    try {
      const result = await submitReview(currentCard, quality)
      const days = result.interval_days
      const label = days === 1 ? '1 dia' : `${days} dias`
      toast.success(`Próxima revisão em ${label}`)

      // dueCards is updated by the hook (card removed)
      // Check if there are more cards at the current index
      if (studyIndex < dueCards.length - 1) {
        // Don't increment index since the array shifted
        setStudyFlipped(false)
      } else if (dueCards.length > 1) {
        // Last card but more remain (array shifted)
        setStudyIndex(0)
        setStudyFlipped(false)
      } else {
        // No more cards
        toast.success('Todas as revisões de hoje concluídas!')
        setStudyMode(false)
        // Refresh stats
        const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
        fetchReviewStats(matData)
      }
    } catch (error: unknown) {
      toast.error('Erro ao registrar revisão: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSubmittingReview(false)
  }

  // Study mode view
  if (studyMode && dueCards.length > 0) {
    const currentCard = dueCards[Math.min(studyIndex, dueCards.length - 1)]
    const conteudoNome = getConteudoNome(currentCard.conteudo_id)
    const cardMateria = getMateriaNome(currentCard.materia_id)

    const previewErrei = calculateSM2(currentCard, 0)
    const previewDificil = calculateSM2(currentCard, 3)
    const previewFacil = calculateSM2(currentCard, 5)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Revisão Espaçada</h1>
            <p className="text-muted-foreground">
              Card {Math.min(studyIndex + 1, dueCards.length)} de {dueCards.length} pendentes
            </p>
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
                {currentCard.type === 'cloze' && currentCard.card_index != null && (
                  <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600">Omissão {currentCard.card_index}</Badge>
                )}
              </div>
              <p className="text-xl font-medium whitespace-pre-wrap">
                {currentCard.type === 'cloze' && currentCard.card_index != null
                  ? (studyFlipped
                      ? renderClozeAnswer(currentCard.pergunta, currentCard.card_index)
                      : renderClozeQuestion(currentCard.pergunta, currentCard.card_index))
                  : (studyFlipped ? currentCard.resposta : currentCard.pergunta)
                }
              </p>
              {!studyFlipped && (
                <p className="text-sm text-muted-foreground mt-6">
                  Clique para ver a resposta
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-3">
          {!studyFlipped ? (
            <Button variant="outline" onClick={() => setStudyFlipped(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Virar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => handleStudyQuality(0)}
                disabled={submittingReview}
              >
                Errei
                <span className="ml-1 text-xs opacity-70">({previewErrei.interval_days}d)</span>
              </Button>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                onClick={() => handleStudyQuality(3)}
                disabled={submittingReview}
              >
                Difícil
                <span className="ml-1 text-xs opacity-70">({previewDificil.interval_days}d)</span>
              </Button>
              <Button
                variant="outline"
                className="border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => handleStudyQuality(5)}
                disabled={submittingReview}
              >
                Fácil
                <span className="ml-1 text-xs opacity-70">({previewFacil.interval_days}d)</span>
              </Button>
            </>
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
