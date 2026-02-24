'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flashcard } from '@/types'

export function useFlashcards() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFlashcards = useCallback(async (materiaId?: string, conteudoId?: string) => {
    setLoading(true)
    let query = supabase.from('flashcards').select('*').order('created_at', { ascending: false })

    if (materiaId) {
      query = query.eq('materia_id', materiaId)
    }

    if (conteudoId) {
      query = query.eq('conteudo_id', conteudoId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching flashcards:', error)
    } else {
      setFlashcards(data || [])
    }
    setLoading(false)
  }, [supabase])

  const addFlashcard = async (flashcard: Omit<Flashcard, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('flashcards')
      .insert({ ...flashcard, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setFlashcards(prev => [data, ...prev])
    return data
  }

  const updateFlashcard = async (id: string, updates: Partial<Omit<Flashcard, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('flashcards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setFlashcards(prev => prev.map(f => f.id === id ? data : f))
    return data
  }

  const deleteFlashcard = async (id: string) => {
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id)

    if (error) throw error
    setFlashcards(prev => prev.filter(f => f.id !== id))
  }

  return { flashcards, loading, fetchFlashcards, addFlashcard, updateFlashcard, deleteFlashcard }
}
