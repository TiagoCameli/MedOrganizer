'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flashcard, FlashcardType, FlashcardGroup } from '@/types'
import { parseClozeMarkers, stripClozeMarkers } from '@/lib/cloze'

export function useFlashcards() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const uploadAttachment = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('flashcard-attachments')
      .upload(path, file)

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('flashcard-attachments')
      .getPublicUrl(path)

    return urlData.publicUrl
  }

  const deleteAttachment = async (url: string) => {
    const marker = '/flashcard-attachments/'
    const idx = url.indexOf(marker)
    if (idx === -1) return
    const path = url.slice(idx + marker.length)

    await supabase.storage
      .from('flashcard-attachments')
      .remove([path])
  }

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
      attachmentFile?: File
    }
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const type = flashcard.type || 'basico'
    const { clozeTemplate, type: _type, attachmentFile, ...baseData } = flashcard

    // Upload attachment if provided
    let attachment_url: string | null = null
    if (attachmentFile) {
      attachment_url = await uploadAttachment(attachmentFile)
    }

    if (type === 'basico') {
      const { data, error } = await supabase
        .from('flashcards')
        .insert({ ...baseData, type: 'basico', group_id: null, card_index: null, user_id: user.id, attachment_url })
        .select()
        .single()

      if (error) throw error
      setFlashcards(prev => [data, ...prev])
      return [data]
    }

    if (type === 'basico_invertido') {
      const groupId = crypto.randomUUID()
      const rows = [
        { ...baseData, type: 'basico_invertido' as const, group_id: groupId, card_index: 0, user_id: user.id, attachment_url },
        { ...baseData, pergunta: baseData.resposta, resposta: baseData.pergunta, type: 'basico_invertido' as const, group_id: groupId, card_index: 1, user_id: user.id, attachment_url },
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
          attachment_url,
        })
        .select()
        .single()

      if (error) throw error
      setFlashcards(prev => [data, ...prev])
      return [data]
    }

    throw new Error(`Tipo de flashcard desconhecido: ${type}`)
  }

  const updateFlashcard = async (
    id: string,
    updates: Partial<Omit<Flashcard, 'id' | 'user_id' | 'created_at' | 'ease_factor' | 'interval_days' | 'repetitions' | 'next_review' | 'type' | 'group_id' | 'card_index'>>,
    options?: { attachmentFile?: File; removeAttachment?: boolean; oldAttachmentUrl?: string | null }
  ) => {
    const finalUpdates = { ...updates }

    if (options?.removeAttachment && options.oldAttachmentUrl) {
      await deleteAttachment(options.oldAttachmentUrl)
      finalUpdates.attachment_url = null
    }

    if (options?.attachmentFile) {
      if (options.oldAttachmentUrl) {
        await deleteAttachment(options.oldAttachmentUrl)
      }
      finalUpdates.attachment_url = await uploadAttachment(options.attachmentFile)
    }

    const { data, error } = await supabase
      .from('flashcards')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setFlashcards(prev => prev.map(f => f.id === id ? data : f))
    return data
  }

  const deleteFlashcard = async (id: string, groupId?: string | null) => {
    // Collect attachment URLs to clean up
    const cardsToDelete = groupId
      ? flashcards.filter(f => f.group_id === groupId)
      : flashcards.filter(f => f.id === id)

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

    // Clean up attachments from storage
    const urls = new Set(cardsToDelete.map(c => c.attachment_url).filter(Boolean))
    for (const url of urls) {
      await deleteAttachment(url!).catch(() => {})
    }
  }

  return { flashcards, loading, fetchFlashcards, fetchStudyFlashcards, addFlashcard, updateFlashcard, deleteFlashcard, uploadAttachment, deleteAttachment }
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
