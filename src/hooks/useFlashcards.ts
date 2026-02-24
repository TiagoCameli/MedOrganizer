'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flashcard, FlashcardType, FlashcardGroup } from '@/types'
import { parseClozeMarkers, stripClozeMarkers } from '@/lib/cloze'

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

  const fetchStudyFlashcards = useCallback(async (materiaIds: string[], conteudoIds?: string[]) => {
    setLoading(true)
    let query = supabase.from('flashcards').select('*').in('materia_id', materiaIds).order('created_at', { ascending: false })

    if (conteudoIds && conteudoIds.length > 0) {
      query = query.in('conteudo_id', conteudoIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching study flashcards:', error)
    } else {
      setFlashcards(data || [])
    }
    setLoading(false)
    return data || []
  }, [supabase])

  const addFlashcard = async (
    flashcard: Omit<Flashcard, 'id' | 'user_id' | 'created_at' | 'ease_factor' | 'interval_days' | 'repetitions' | 'next_review' | 'type' | 'group_id' | 'card_index' | 'status' | 'lapses' | 'learning_step'> & {
      type?: FlashcardType
      clozeTemplate?: string
    }
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const type = flashcard.type || 'basico'
    const { clozeTemplate, type: _type, ...baseData } = flashcard

    if (type === 'basico') {
      const { data, error } = await supabase
        .from('flashcards')
        .insert({ ...baseData, type: 'basico', group_id: null, card_index: null, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      setFlashcards(prev => [data, ...prev])
      return [data]
    }

    if (type === 'basico_invertido') {
      const groupId = crypto.randomUUID()
      const rows = [
        { ...baseData, type: 'basico_invertido' as const, group_id: groupId, card_index: 0, user_id: user.id },
        { ...baseData, pergunta: baseData.resposta, resposta: baseData.pergunta, type: 'basico_invertido' as const, group_id: groupId, card_index: 1, user_id: user.id },
      ]

      const { data, error } = await supabase
        .from('flashcards')
        .insert(rows)
        .select()

      if (error) throw error
      setFlashcards(prev => [...(data || []), ...prev])
      return data || []
    }

    if (type === 'cloze') {
      const template = clozeTemplate || flashcard.pergunta
      const markers = parseClozeMarkers(template)
      if (markers.length === 0) throw new Error('Nenhuma omissão marcada no texto')

      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          ...baseData,
          pergunta: template,
          resposta: markers.map(m => m.word).join(', '),
          type: 'cloze' as const,
          group_id: null,
          card_index: null,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      setFlashcards(prev => [data, ...prev])
      return [data]
    }

    throw new Error(`Tipo de flashcard desconhecido: ${type}`)
  }

  const updateFlashcard = async (id: string, updates: Partial<Omit<Flashcard, 'id' | 'user_id' | 'created_at' | 'ease_factor' | 'interval_days' | 'repetitions' | 'next_review' | 'type' | 'group_id' | 'card_index'>>) => {
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

  const deleteFlashcard = async (id: string, groupId?: string | null) => {
    if (groupId) {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('group_id', groupId)

      if (error) throw error
      setFlashcards(prev => prev.filter(f => f.group_id !== groupId))
    } else {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id)

      if (error) throw error
      setFlashcards(prev => prev.filter(f => f.id !== id))
    }
  }

  return { flashcards, loading, fetchFlashcards, fetchStudyFlashcards, addFlashcard, updateFlashcard, deleteFlashcard }
}

/**
 * Group flashcards by group_id for browse display.
 * Cards without group_id (basico) are standalone groups.
 */
export function groupFlashcards(cards: Flashcard[]): FlashcardGroup[] {
  const groupMap = new Map<string, Flashcard[]>()
  const standalone: Flashcard[] = []

  for (const card of cards) {
    if (card.group_id) {
      if (!groupMap.has(card.group_id)) {
        groupMap.set(card.group_id, [])
      }
      groupMap.get(card.group_id)!.push(card)
    } else {
      standalone.push(card)
    }
  }

  const groups: FlashcardGroup[] = []

  // Standalone cards (basico and cloze)
  for (const card of standalone) {
    groups.push({
      group_id: null,
      type: card.type,
      cards: [card],
      display_pergunta: card.type === 'cloze' ? stripClozeMarkers(card.pergunta) : card.pergunta,
      display_resposta: card.resposta,
      card_count: 1,
    })
  }

  // Grouped cards (invertido / cloze)
  for (const [groupId, groupCards] of groupMap) {
    groupCards.sort((a, b) => (a.card_index ?? 0) - (b.card_index ?? 0))
    const first = groupCards[0]

    let displayPergunta: string
    let displayResposta: string

    if (first.type === 'cloze') {
      displayPergunta = stripClozeMarkers(first.pergunta)
      displayResposta = groupCards.map(c => c.resposta).join(', ')
    } else {
      // basico_invertido: use card_index=0 (the original direction)
      const primary = groupCards.find(c => c.card_index === 0) || first
      displayPergunta = primary.pergunta
      displayResposta = primary.resposta
    }

    groups.push({
      group_id: groupId,
      type: first.type,
      cards: groupCards,
      display_pergunta: displayPergunta,
      display_resposta: displayResposta,
      card_count: groupCards.length,
    })
  }

  // Sort by created_at desc (use first card's created_at)
  groups.sort((a, b) => {
    const aDate = a.cards[0]?.created_at || ''
    const bDate = b.cards[0]?.created_at || ''
    return bDate.localeCompare(aDate)
  })

  return groups
}
