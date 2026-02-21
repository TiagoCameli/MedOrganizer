'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Semestre } from '@/types'

export function useSemestres() {
  const [semestres, setSemestres] = useState<Semestre[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchSemestres = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('semestres')
      .select('*')
      .order('numero')

    if (!error) {
      setSemestres(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSemestres()
  }, [fetchSemestres])

  const upsertSemestre = async (numero: number, data_inicio: string, data_fim: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const existing = semestres.find(s => s.numero === numero)

    if (existing) {
      const { data, error } = await supabase
        .from('semestres')
        .update({ data_inicio, data_fim })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      setSemestres(prev => prev.map(s => s.id === existing.id ? data : s))
      return data
    } else {
      const { data, error } = await supabase
        .from('semestres')
        .insert({ user_id: user.id, numero, data_inicio, data_fim })
        .select()
        .single()
      if (error) throw error
      setSemestres(prev => [...prev, data].sort((a, b) => a.numero - b.numero))
      return data
    }
  }

  const deleteSemestre = async (id: string) => {
    const { error } = await supabase
      .from('semestres')
      .delete()
      .eq('id', id)
    if (error) throw error
    setSemestres(prev => prev.filter(s => s.id !== id))
  }

  return { semestres, loading, fetchSemestres, upsertSemestre, deleteSemestre }
}
