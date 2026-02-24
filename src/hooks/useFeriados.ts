'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Feriado } from '@/types'

export function useFeriados() {
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFeriados = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .order('data')

    if (error) {
      console.error('Error fetching feriados:', error)
    } else {
      setFeriados(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchFeriados()
  }, [fetchFeriados])

  const addFeriado = async (feriado: Omit<Feriado, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('feriados')
      .insert({ ...feriado, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setFeriados(prev => [...prev, data].sort((a, b) => a.data.localeCompare(b.data)))
    return data
  }

  const updateFeriado = async (id: string, updates: Partial<Omit<Feriado, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('feriados')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setFeriados(prev => prev.map(f => f.id === id ? data : f).sort((a, b) => a.data.localeCompare(b.data)))
    return data
  }

  const deleteFeriado = async (id: string) => {
    const { error } = await supabase
      .from('feriados')
      .delete()
      .eq('id', id)

    if (error) throw error
    setFeriados(prev => prev.filter(f => f.id !== id))
  }

  return { feriados, loading, fetchFeriados, addFeriado, updateFeriado, deleteFeriado }
}
