'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeaknessTopic, ConteudoWeaknessStats } from '@/types'

export function useWeaknessTracker() {
  const [weaknesses, setWeaknesses] = useState<WeaknessTopic[]>([])
  const [computedWeaknesses, setComputedWeaknesses] = useState<ConteudoWeaknessStats[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchWeaknesses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('weakness_topics')
      .select('*')
      .order('difficulty', { ascending: false })

    if (error) {
      console.error('Error fetching weaknesses:', error)
    } else {
      setWeaknesses(data || [])
    }
    setLoading(false)
  }, [supabase])

  const addWeakness = async (weakness: Omit<WeaknessTopic, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('weakness_topics')
      .insert({ ...weakness, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setWeaknesses(prev => [data, ...prev])
    return data
  }

  const updateWeakness = async (id: string, updates: Partial<Omit<WeaknessTopic, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase
      .from('weakness_topics')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setWeaknesses(prev => prev.map(w => w.id === id ? data : w))
    return data
  }

  const deleteWeakness = async (id: string) => {
    const { error } = await supabase
      .from('weakness_topics')
      .delete()
      .eq('id', id)

    if (error) throw error
    setWeaknesses(prev => prev.filter(w => w.id !== id))
  }

  const fetchComputedWeaknesses = useCallback(async (
    materias: { id: string; nome: string; cor: string }[],
    conteudos: { id: string; nome: string; materia_id: string }[]
  ) => {
    setLoading(true)

    // Fetch all reviews grouped by flashcard
    const { data: reviews, error } = await supabase
      .from('flashcard_reviews')
      .select('flashcard_id, quality, reviewed_at')
      .order('reviewed_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews for weakness computation:', error)
      setLoading(false)
      return []
    }

    // Fetch flashcards to map flashcard_id -> conteudo_id, materia_id
    const { data: flashcards, error: fcError } = await supabase
      .from('flashcards')
      .select('id, materia_id, conteudo_id')

    if (fcError) {
      console.error('Error fetching flashcards for weakness computation:', fcError)
      setLoading(false)
      return []
    }

    const fcMap = new Map(flashcards?.map(f => [f.id, f]) || [])
    const materiaMap = new Map(materias.map(m => [m.id, m]))
    const conteudoMap = new Map(conteudos.map(c => [c.id, c]))

    // Group reviews by conteudo_id
    const byConteudo = new Map<string, { total: number; errors: number; last: string | null }>()

    for (const review of (reviews || [])) {
      const fc = fcMap.get(review.flashcard_id)
      if (!fc) continue
      const key = fc.conteudo_id || `materia:${fc.materia_id}`

      if (!byConteudo.has(key)) {
        byConteudo.set(key, { total: 0, errors: 0, last: null })
      }
      const entry = byConteudo.get(key)!
      entry.total++
      if (review.quality === 0) entry.errors++
      if (!entry.last || review.reviewed_at > entry.last) {
        entry.last = review.reviewed_at
      }
    }

    // Build stats array
    const stats: ConteudoWeaknessStats[] = []

    for (const [key, data] of byConteudo) {
      if (data.total === 0) continue

      let conteudo_id: string | null = null
      let conteudo_nome: string | null = null
      let materia_id: string

      if (key.startsWith('materia:')) {
        materia_id = key.replace('materia:', '')
      } else {
        conteudo_id = key
        const cont = conteudoMap.get(key)
        conteudo_nome = cont?.nome || null
        materia_id = cont?.materia_id || ''
      }

      const mat = materiaMap.get(materia_id)
      if (!mat) continue

      stats.push({
        conteudo_id,
        conteudo_nome: conteudo_nome || '(Sem conteúdo)',
        materia_id,
        materia_nome: mat.nome,
        materia_cor: mat.cor,
        total_reviews: data.total,
        errors: data.errors,
        error_rate: Math.round((data.errors / data.total) * 100),
        last_reviewed: data.last,
      })
    }

    // Sort by error rate descending
    stats.sort((a, b) => b.error_rate - a.error_rate)
    setComputedWeaknesses(stats)
    setLoading(false)
    return stats
  }, [supabase])

  const getWeeklyReviewSuggestion = useCallback((
    computed: ConteudoWeaknessStats[],
    manual: WeaknessTopic[],
    materias: { id: string; nome: string; cor: string }[],
    conteudos: { id: string; nome: string; materia_id: string }[]
  ) => {
    const materiaMap = new Map(materias.map(m => [m.id, m]))
    const conteudoMap = new Map(conteudos.map(c => [c.id, c]))

    // Top 5 computed weaknesses
    const topComputed = computed.filter(c => c.error_rate > 0).slice(0, 5)

    // Top 3 manual weaknesses
    const topManual = manual.slice(0, 3).map(w => {
      const mat = materiaMap.get(w.materia_id)
      const cont = w.conteudo_id ? conteudoMap.get(w.conteudo_id) : null
      return {
        ...w,
        materia_nome: mat?.nome || '',
        materia_cor: mat?.cor || '',
        conteudo_nome: cont?.nome || null,
      }
    })

    return { topComputed, topManual }
  }, [])

  return {
    weaknesses,
    computedWeaknesses,
    loading,
    fetchWeaknesses,
    addWeakness,
    updateWeakness,
    deleteWeakness,
    fetchComputedWeaknesses,
    getWeeklyReviewSuggestion,
  }
}
