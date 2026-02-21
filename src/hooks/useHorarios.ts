'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Horario } from '@/types'

export function useHorarios() {
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchHorarios = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('horarios')
      .select('*, materia:materias(*)')
      .order('hora_inicio')

    if (error) {
      console.error('Error fetching horarios:', error)
    } else {
      setHorarios(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchHorarios()
  }, [fetchHorarios])

  const addHorario = async (horario: Omit<Horario, 'id' | 'user_id' | 'materia'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('horarios')
      .insert({ ...horario, user_id: user.id })
      .select('*, materia:materias(*)')
      .single()

    if (error) throw error
    setHorarios(prev => [...prev, data].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)))
    return data
  }

  const updateHorario = async (id: string, updates: Partial<Omit<Horario, 'id' | 'user_id' | 'materia'>>) => {
    const { data, error } = await supabase
      .from('horarios')
      .update(updates)
      .eq('id', id)
      .select('*, materia:materias(*)')
      .single()

    if (error) throw error
    setHorarios(prev => prev.map(h => h.id === id ? data : h))
    return data
  }

  const deleteHorario = async (id: string) => {
    const { error } = await supabase
      .from('horarios')
      .delete()
      .eq('id', id)

    if (error) throw error
    setHorarios(prev => prev.filter(h => h.id !== id))
  }

  return { horarios, loading, fetchHorarios, addHorario, updateHorario, deleteHorario }
}
