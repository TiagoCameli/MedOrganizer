'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Conteudo } from '@/types'

export function useConteudos() {
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchConteudos = useCallback(async (materiaId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('conteudos')
      .select('*')
      .eq('materia_id', materiaId)
      .order('nome')

    if (error) {
      console.error('Error fetching conteudos:', error)
    } else {
      setConteudos(data || [])
    }
    setLoading(false)
  }, [supabase])

  const addConteudo = async (conteudo: Omit<Conteudo, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('conteudos')
      .insert({ ...conteudo, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setConteudos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    return data
  }

  const updateConteudo = async (id: string, updates: Partial<Omit<Conteudo, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('conteudos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setConteudos(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  const deleteConteudo = async (id: string) => {
    const { error } = await supabase
      .from('conteudos')
      .delete()
      .eq('id', id)

    if (error) throw error
    setConteudos(prev => prev.filter(c => c.id !== id))
  }

  return { conteudos, loading, fetchConteudos, addConteudo, updateConteudo, deleteConteudo }
}
