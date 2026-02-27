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

    // Auto-create root folder for the new materia
    await supabase
      .from('pastas')
      .insert({ user_id: user.id, materia_id: data.id, parent_id: null, nome: data.nome })

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
    // Clean up storage files before deleting (DB cascade handles rows)
    const { data: pastasData } = await supabase
      .from('pastas')
      .select('id')
      .eq('materia_id', id)

    if (pastasData && pastasData.length > 0) {
      const pastaIds = pastasData.map(p => p.id)
      const { data: arquivosToDelete } = await supabase
        .from('arquivos')
        .select('storage_path')
        .in('pasta_id', pastaIds)

      if (arquivosToDelete && arquivosToDelete.length > 0) {
        await supabase.storage
          .from('materias-arquivos')
          .remove(arquivosToDelete.map(a => a.storage_path))
      }
    }

    const { error } = await supabase
      .from('materias')
      .delete()
      .eq('id', id)

    if (error) throw error
    setMaterias(prev => prev.filter(m => m.id !== id))
  }

  return { materias, loading, fetchMaterias, addMateria, updateMateria, deleteMateria }
}
