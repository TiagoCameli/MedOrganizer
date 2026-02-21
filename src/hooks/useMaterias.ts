'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Materia } from '@/types'

export function useMaterias() {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchMaterias = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('materias')
      .select('*')
      .order('nome')

    if (error) {
      console.error('Error fetching materias:', error)
    } else {
      setMaterias(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchMaterias()
  }, [fetchMaterias])

  const addMateria = async (materia: Omit<Materia, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('materias')
      .insert({ ...materia, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setMaterias(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    return data
  }

  const updateMateria = async (id: string, updates: Partial<Omit<Materia, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('materias')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setMaterias(prev => prev.map(m => m.id === id ? data : m))
    return data
  }

  const deleteMateria = async (id: string) => {
    const { error } = await supabase
      .from('materias')
      .delete()
      .eq('id', id)

    if (error) throw error
    setMaterias(prev => prev.filter(m => m.id !== id))
  }

  return { materias, loading, fetchMaterias, addMateria, updateMateria, deleteMateria }
}
