'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Nota } from '@/types'

export function useNotas() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotas = useCallback(async (materiaId?: string) => {
    setLoading(true)
    let query = supabase.from('notas').select('*').order('created_at')

    if (materiaId) {
      query = query.eq('materia_id', materiaId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notas:', error)
    } else {
      setNotas(data || [])
    }
    setLoading(false)
  }, [supabase])

  const addNota = async (nota: Omit<Nota, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('notas')
      .insert({ ...nota, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    setNotas(prev => [...prev, data])
    return data
  }

  const updateNota = async (id: string, updates: Partial<Omit<Nota, 'id' | 'user_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('notas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setNotas(prev => prev.map(n => n.id === id ? data : n))
    return data
  }

  const deleteNota = async (id: string) => {
    const { error } = await supabase
      .from('notas')
      .delete()
      .eq('id', id)

    if (error) throw error
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  const calcularMedia = (notasList: Nota[] = notas): number => {
    if (notasList.length === 0) return 0
    const somaNotasPeso = notasList.reduce((acc, n) => acc + n.nota * n.peso, 0)
    const somaPesos = notasList.reduce((acc, n) => acc + n.peso, 0)
    return somaPesos > 0 ? somaNotasPeso / somaPesos : 0
  }

  const calcularNotaNecessaria = (mediaMinima: number, pesoProximaAvaliacao: number = 1): number | null => {
    if (notas.length === 0) return mediaMinima
    const somaNotasPeso = notas.reduce((acc, n) => acc + n.nota * n.peso, 0)
    const somaPesos = notas.reduce((acc, n) => acc + n.peso, 0)
    const notaNecessaria = (mediaMinima * (somaPesos + pesoProximaAvaliacao) - somaNotasPeso) / pesoProximaAvaliacao
    return notaNecessaria
  }

  return { notas, loading, fetchNotas, addNota, updateNota, deleteNota, calcularMedia, calcularNotaNecessaria }
}
