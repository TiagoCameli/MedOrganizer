'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flashcard, StudyQuality, ReviewStats, FlashcardReview } from '@/types'
import { processAnswer, getNextIntervals, formatInterval, SRS_CONFIG } from '@/lib/srs-engine'

// Re-export for consumers
export { processAnswer, getNextIntervals, formatInterval, SRS_CONFIG }

export function useSpacedRepetition() {
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewStats, setReviewStats] = useState<ReviewStats[]>([])
  const supabase = createClient()

  // Sort cards by priority: relearning > review > learning > new
  const statusPriority = (status: string) => {
    switch (status) {
      case 'relearning': return 0
      case 'review': return 1
      case 'learning': return 2
      case 'new': return 3
      default: return 4
    }
  }

  const fetchDueCards = useCallback(async (materiaIds?: string[]) => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('flashcards')
        .select('*')
        .lte('next_review', today)

      if (materiaIds && materiaIds.length > 0) {
        query = query.in('materia_id', materiaIds)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching due cards:', error)
        setDueCards([])
        setLoading(false)
        return []
      }

      const allDue = data || []

      // Sort by status priority, then by next_review asc
      allDue.sort((a, b) => {
        const pa = statusPriority(a.status)
        const pb = statusPriority(b.status)
        if (pa !== pb) return pa - pb
        return a.next_review.localeCompare(b.next_review)
      })

      // Apply daily limits
      let newCount = 0
      let reviewCount = 0
      const limited = allDue.filter(card => {
        if (card.status === 'new') {
          if (newCount >= SRS_CONFIG.newCardsPerDay) return false
          newCount++
          return true
        }
        if (card.status === 'review') {
          if (reviewCount >= SRS_CONFIG.maxReviewsPerDay) return false
          reviewCount++
          return true
        }
        // learning and relearning always included
        return true
      })

      setDueCards(limited)
      setLoading(false)
      return limited
    } catch (e) {
      console.error('Error fetching due cards:', e)
      setDueCards([])
      setLoading(false)
      return []
    }
  }, [supabase])

  const submitReview = useCallback(async (
    flashcard: Flashcard,
    quality: StudyQuality,
    timeTaken?: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const result = processAnswer(flashcard, quality)

    // Update flashcard with new SRS values
    const { error: updateError } = await supabase
      .from('flashcards')
      .update({
        ease_factor: result.ease_factor,
        interval_days: result.interval_days,
        repetitions: result.repetitions,
        next_review: result.next_review,
        status: result.status,
        lapses: result.lapses,
        learning_step: result.learning_step,
      })
      .eq('id', flashcard.id)

    if (updateError) throw updateError

    // Log the review
    const { error: reviewError } = await supabase
      .from('flashcard_reviews')
      .insert({
        user_id: user.id,
        flashcard_id: flashcard.id,
        quality,
        ease_factor_before: flashcard.ease_factor,
        ease_factor_after: result.ease_factor,
        interval_before: flashcard.interval_days,
        interval_after: result.interval_days,
        time_taken: timeTaken ?? null,
      })

    if (reviewError) throw reviewError

    // Remove from dueCards
    setDueCards(prev => prev.filter(c => c.id !== flashcard.id))

    return result
  }, [supabase])

  const fetchReviewStats = useCallback(async (
    materias: { id: string; nome: string; cor: string }[]
  ) => {
    if (materias.length === 0) {
      setReviewStats([])
      return []
    }

    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const materiaIds = materias.map(m => m.id)

      const { data: allCards, error } = await supabase
        .from('flashcards')
        .select('id, materia_id, repetitions, next_review, status, interval_days, ease_factor')
        .in('materia_id', materiaIds)

      if (error) {
        console.error('Error fetching review stats:', error)
        setLoading(false)
        return []
      }

      const stats: ReviewStats[] = materias.map(m => {
        const cards = (allCards || []).filter(c => c.materia_id === m.id)
        const total = cards.length
        const due = cards.filter(c => c.next_review <= today).length
        const learned = cards.filter(c => c.repetitions > 0).length
        const new_cards = cards.filter(c => c.status === 'new').length
        const learning_cards = cards.filter(c => c.status === 'learning' || c.status === 'relearning').length
        const mature_cards = cards.filter(c => c.interval_days >= 21).length
        const retention_rate = total > 0 ? Math.round((learned / total) * 100) : 0
        const avg_interval = cards.length > 0
          ? Math.round(cards.reduce((sum, c) => sum + c.interval_days, 0) / cards.length * 10) / 10
          : 0

        return {
          materia_id: m.id,
          materia_nome: m.nome,
          materia_cor: m.cor,
          total,
          due,
          learned,
          new_cards,
          learning_cards,
          mature_cards,
          retention_rate,
          avg_interval,
        }
      }).filter(s => s.total > 0)

      setReviewStats(stats)
      setLoading(false)
      return stats
    } catch (e) {
      console.error('Error fetching review stats:', e)
      setReviewStats([])
      setLoading(false)
      return []
    }
  }, [supabase])

  // Fetch review history for statistics charts
  const fetchReviewHistory = useCallback(async (days: number = 30) => {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const sinceStr = since.toISOString()

      const { data, error } = await supabase
        .from('flashcard_reviews')
        .select('*')
        .gte('reviewed_at', sinceStr)
        .order('reviewed_at', { ascending: true })

      if (error) {
        console.error('Error fetching review history:', error)
        return []
      }
      return (data || []) as FlashcardReview[]
    } catch (e) {
      console.error('Error fetching review history:', e)
      return []
    }
  }, [supabase])

  // Fetch all flashcards for statistics (interval distribution, forecast)
  const fetchAllFlashcards = useCallback(async (materiaIds?: string[]) => {
    try {
      let query = supabase
        .from('flashcards')
        .select('*')

      if (materiaIds && materiaIds.length > 0) {
        query = query.in('materia_id', materiaIds)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching all flashcards:', error)
        return []
      }
      return (data || []) as Flashcard[]
    } catch (e) {
      console.error('Error fetching all flashcards:', e)
      return []
    }
  }, [supabase])

  return {
    dueCards,
    loading,
    reviewStats,
    fetchDueCards,
    submitReview,
    fetchReviewStats,
    fetchReviewHistory,
    fetchAllFlashcards,
  }
}
