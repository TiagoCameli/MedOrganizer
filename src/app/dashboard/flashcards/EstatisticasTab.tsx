'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMaterias } from '@/hooks/useMaterias'
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition'
import { FlashcardReview, Flashcard } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  TrendingUp, Calendar, Flame, Brain, Loader2
} from 'lucide-react'
import { format, subDays, addDays, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

export default function EstatisticasTab() {
  const { materias } = useMaterias()
  const {
    reviewStats, fetchReviewStats,
    fetchReviewHistory, fetchAllFlashcards,
  } = useSpacedRepetition()

  const [reviews, setReviews] = useState<FlashcardReview[]>([])
  const [allCards, setAllCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMateriaId, setFilterMateriaId] = useState('')

  // Load data
  useEffect(() => {
    if (materias.length === 0) return

    const load = async () => {
      setLoading(true)
      const matData = materias.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))
      await fetchReviewStats(matData)
      const [revs, cards] = await Promise.all([
        fetchReviewHistory(30),
        fetchAllFlashcards(),
      ])
      setReviews(revs)
      setAllCards(cards)
      setLoading(false)
    }
    load()
  }, [materias, fetchReviewStats, fetchReviewHistory, fetchAllFlashcards])

  // Build card-to-materia lookup
  const cardMateriaMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of allCards) map.set(c.id, c.materia_id)
    return map
  }, [allCards])

  // Filter cards and reviews by selected materia
  const filteredCards = useMemo(() => {
    if (!filterMateriaId) return allCards
    return allCards.filter(c => c.materia_id === filterMateriaId)
  }, [allCards, filterMateriaId])

  const filteredReviews = useMemo(() => {
    if (!filterMateriaId) return reviews
    return reviews.filter(r => cardMateriaMap.get(r.flashcard_id) === filterMateriaId)
  }, [reviews, filterMateriaId, cardMateriaMap])

  // ========================================
  // Summary metrics
  // ========================================
  const matureCards = filteredCards.filter(c => c.interval_days >= 21)
  const totalCards = filteredCards.length

  // Retention: % of mature cards that were answered correctly (quality > 1) in last 30 days
  const matureCardIds = new Set(matureCards.map(c => c.id))
  const matureReviews = filteredReviews.filter(r => matureCardIds.has(r.flashcard_id))
  const matureCorrect = matureReviews.filter(r => r.quality > 1).length
  const retentionRate = matureReviews.length > 0
    ? Math.round((matureCorrect / matureReviews.length) * 100)
    : 0

  // Reviews today
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const reviewsToday = filteredReviews.filter(r =>
    r.reviewed_at.startsWith(todayStr)
  ).length

  // Streak
  const streak = useMemo(() => {
    const reviewDates = new Set(
      filteredReviews.map(r => r.reviewed_at.split('T')[0])
    )
    let count = 0
    const check = new Date()
    while (true) {
      if (reviewDates.has(format(check, 'yyyy-MM-dd'))) {
        count++
        check.setDate(check.getDate() - 1)
      } else {
        break
      }
    }
    return count
  }, [filteredReviews])

  // ========================================
  // Chart 1: Reviews per day (last 30 days)
  // ========================================
  const reviewsPerDayData = useMemo(() => {
    const today = new Date()
    const start = subDays(today, 29)
    const days = eachDayOfInterval({ start, end: today })

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayLabel = format(day, 'dd/MM')
      const dayReviews = filteredReviews.filter(r => r.reviewed_at.startsWith(dateStr))
      const correct = dayReviews.filter(r => r.quality > 1).length
      const errors = dayReviews.filter(r => r.quality === 1).length

      return { day: dayLabel, Acertos: correct, Erros: errors }
    })
  }, [filteredReviews])

  // ========================================
  // Chart 2: Forecast (next 30 days)
  // ========================================
  const forecastData = useMemo(() => {
    const today = new Date()
    const days = eachDayOfInterval({
      start: today,
      end: addDays(today, 29),
    })

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayLabel = format(day, 'dd/MM')
      const count = filteredCards.filter(c => c.next_review === dateStr).length

      return { day: dayLabel, Revisões: count }
    })
  }, [filteredCards])

  // ========================================
  // Chart 3: Interval distribution
  // ========================================
  const intervalDistData = useMemo(() => {
    const buckets = [
      { label: '< 1d', min: 0, max: 1 },
      { label: '1-3d', min: 1, max: 4 },
      { label: '4-7d', min: 4, max: 8 },
      { label: '8-14d', min: 8, max: 15 },
      { label: '15-30d', min: 15, max: 31 },
      { label: '1-3m', min: 31, max: 91 },
      { label: '3-6m', min: 91, max: 181 },
      { label: '6-12m', min: 181, max: 366 },
      { label: '> 1a', min: 366, max: Infinity },
    ]

    return buckets.map(b => ({
      intervalo: b.label,
      Cards: filteredCards.filter(c =>
        c.interval_days >= b.min && c.interval_days < b.max
      ).length,
    }))
  }, [filteredCards])

  // ========================================
  // Stats table
  // ========================================
  const filteredStats = useMemo(() => {
    if (!filterMateriaId) return reviewStats
    return reviewStats.filter(s => s.materia_id === filterMateriaId)
  }, [reviewStats, filterMateriaId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estatísticas</h1>
          <p className="text-muted-foreground">Acompanhe seu progresso de revisão</p>
        </div>
        <Select
          value={filterMateriaId || '_all'}
          onValueChange={v => setFilterMateriaId(v === '_all' ? '' : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as matérias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as matérias</SelectItem>
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{retentionRate}%</p>
                <p className="text-sm text-muted-foreground">Retenção (maduros)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewsToday}</p>
                <p className="text-sm text-muted-foreground">Revisões hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{streak} dia{streak !== 1 ? 's' : ''}</p>
                <p className="text-sm text-muted-foreground">Sequência</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{matureCards.length}/{totalCards}</p>
                <p className="text-sm text-muted-foreground">Cards maduros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: Reviews per day */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Revisões por Dia (30 dias)</h3>
            {filteredReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <Calendar className="h-10 w-10 mb-3" />
                <p className="text-sm">Nenhuma revisão registrada</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={reviewsPerDayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 12 }} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Acertos" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Erros" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Forecast */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Previsão de Carga (30 dias)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 12 }} width={30} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                <Line
                  type="monotone"
                  dataKey="Revisões"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart 3: Interval distribution */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Distribuição de Intervalos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={intervalDistData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="intervalo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} width={30} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
              <Bar dataKey="Cards" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stats table per materia */}
      {filteredStats.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Matéria</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Novos</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Aprendendo</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Maduros</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Retenção</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Int. Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStats.map(stat => (
                    <tr key={stat.materia_id} className="border-b last:border-b-0">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: stat.materia_cor }} />
                          <span className="text-sm font-medium">{stat.materia_nome}</span>
                        </div>
                      </td>
                      <td className="text-center p-3 text-sm">{stat.total}</td>
                      <td className="text-center p-3">
                        <Badge variant="secondary" className="text-xs">{stat.new_cards}</Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                          {stat.learning_cards}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                          {stat.mature_cards}
                        </Badge>
                      </td>
                      <td className="text-center p-3 text-sm">{stat.retention_rate}%</td>
                      <td className="text-center p-3 text-sm text-muted-foreground">{stat.avg_interval}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
