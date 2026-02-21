'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Evento } from '@/types'

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchEventos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('eventos')
      .select('*, materia:materias(*)')
      .order('data_entrega')

    if (error) {
      console.error('Error fetching eventos:', error)
    } else {
      setEventos(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchEventos()
  }, [fetchEventos])

  const addEvento = async (evento: Omit<Evento, 'id' | 'user_id' | 'created_at' | 'materia'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('eventos')
      .insert({ ...evento, user_id: user.id })
      .select('*, materia:materias(*)')
      .single()

    if (error) throw error
    setEventos(prev => [...prev, data].sort((a, b) => a.data_entrega.localeCompare(b.data_entrega)))
    return data
  }

  const updateEvento = async (id: string, updates: Partial<Omit<Evento, 'id' | 'user_id' | 'created_at' | 'materia'>>) => {
    const { data, error } = await supabase
      .from('eventos')
      .update(updates)
      .eq('id', id)
      .select('*, materia:materias(*)')
      .single()

    if (error) throw error
    setEventos(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  const deleteEvento = async (id: string) => {
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id)

    if (error) throw error
    setEventos(prev => prev.filter(e => e.id !== id))
  }

  const toggleConcluido = async (id: string, concluido: boolean) => {
    return updateEvento(id, { concluido })
  }

  return { eventos, loading, fetchEventos, addEvento, updateEvento, deleteEvento, toggleConcluido }
}
