'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flashcard, StudyQuality, ReviewStats } from '@/types'

interface SM2Result {
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review: string
}

export function calculateSM2(flashcard: Flashcard, quality: StudyQuality): SM2Result {
  let { ease_factor, interval_days, repetitions } = flashcard

  if (quality < 3) {
    // Failed — reset
    repetitions = 0
    interval_days = 1
  } else {
    // Passed
    repetitions += 1
    if (repetitions === 1) {
      interval_days = 1
    } else if (repetitions === 2) {
      interval_days = 6
    } else {
      interval_days = Math.round(interval_days * ease_factor)
    }
  }

  // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (ease_factor < 1.3) ease_factor = 1.3

  // Calculate next review date
  const today = new Date()
  const nextDate = new Date(today)
  nextDate.setDate(nextDate.getDate() + interval_days)
  const next_review = nextDate.toISOString().split('T')[0]

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    repetitions,
    next_review,
  }
}

export function useSpacedRepetition() {
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewStats, setReviewStats] = useState<ReviewStats[]>([])
  const supabase = createClient()

  const fetchDueCards = useCallback(async (materiaIds?: string[]) => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('flashcards')
        .select('*')
        .lte('next_review', today)
        .order('next_review', { ascending: true })

      if (materiaIds && materiaIds.length > 0) {
        query = query.in('materia_id', materiaIds)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching due cards:', error)
        setDueCards([])
      } else {
        setDueCards(data || [])
      }
      setLoading(false)
      return data || []
    } catch (e) {
      console.error('Error fetching due cards:', e)
      setDueCards([])
      setLoading(false)
      return []
    }
  }, [supabase])

  const submitReview = useCallback(async (flashcard: Flashcard, quality: StudyQuality) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const result = calculateSM2(flashcard, quality)

    // Update flashcard with new SM-2 values
    const { error: updateError } = await supabase
      .from('flashcards')
      .update({
        ease_factor: result.ease_factor,
        interval_days: result.interval_days,
        repetitions: result.repetitions,
        next_review: result.next_review,
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
        .select('id, materia_id, repetitions, next_review')
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
        const new_cards = cards.filter(c => c.repetitions === 0).length
        const retention_rate = total > 0 ? Math.round((learned / total) * 100) : 0

        return {
          materia_id: m.id,
          materia_nome: m.nome,
          materia_cor: m.cor,
          total,
          due,
          learned,
          new_cards,
          retention_rate,
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

  return {
    dueCards,
    loading,
    reviewStats,
    fetchDueCards,
    submitReview,
    fetchReviewStats,
  }
}
