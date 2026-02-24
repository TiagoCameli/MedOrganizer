'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StudySession, StudyGoal } from '@/types'

export function useStudySessions() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // --- Sessions ---

  const fetchSessions = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .gte('studied_at', startDate)
      .lte('studied_at', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching study sessions:', error)
    } else {
      setSessions(data || [])
    }
    setLoading(false)
  }, [supabase])

  const addSession = async (session: Omit<StudySession, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({ ...session, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setSessions(prev => [data, ...prev])
    return data
  }

  const deleteSession = async (id: string) => {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', id)

    if (error) throw error
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  // --- Goals ---

  const fetchGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_goals')
      .select('*')
      .order('created_at')

    if (error) {
      console.error('Error fetching study goals:', error)
    } else {
      setGoals(data || [])
    }
  }, [supabase])

  const upsertGoal = async (materia_id: string, horas_meta: number, tipo: 'semanal' | 'mensal' = 'semanal') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('study_goals')
      .upsert(
        { user_id: user.id, materia_id, horas_meta, tipo },
        { onConflict: 'user_id,materia_id,tipo' }
      )
      .select()
      .single()

    if (error) throw error
    setGoals(prev => {
      const exists = prev.find(g => g.materia_id === materia_id && g.tipo === tipo)
      if (exists) return prev.map(g => (g.materia_id === materia_id && g.tipo === tipo) ? data : g)
      return [...prev, data]
    })
    return data
  }

  const deleteGoal = async (id: string) => {
    const { error } = await supabase
      .from('study_goals')
      .delete()
      .eq('id', id)

    if (error) throw error
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  // Initial load
  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  return {
    sessions, goals, loading,
    fetchSessions, addSession, deleteSession,
    fetchGoals, upsertGoal, deleteGoal
  }
}
