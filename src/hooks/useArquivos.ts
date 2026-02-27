'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pasta, Arquivo } from '@/types'

export function useArquivos() {
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // --- Pastas ---

  const fetchPastas = useCallback(async (materiaId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pastas')
      .select('*')
      .eq('materia_id', materiaId)
      .order('nome')

    if (error) {
      console.error('Error fetching pastas:', error)
    } else {
      setPastas(data || [])
    }
    setLoading(false)
  }, [supabase])

  const addPasta = async (nome: string, materiaId: string, parentId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('pastas')
      .insert({
        user_id: user.id,
        materia_id: materiaId,
        parent_id: parentId,
        nome,
      })
      .select()
      .single()

    if (error) throw error
    setPastas(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    return data
  }

  const renamePasta = async (id: string, nome: string) => {
    const { data, error } = await supabase
      .from('pastas')
      .update({ nome })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setPastas(prev => prev.map(p => p.id === id ? data : p))
    return data
  }

  const deletePasta = async (id: string) => {
    // Find all descendant folder IDs recursively
    const allFolderIds = [id]
    const findDescendants = (parentId: string) => {
      const children = pastas.filter(p => p.parent_id === parentId)
      for (const child of children) {
        allFolderIds.push(child.id)
        findDescendants(child.id)
      }
    }
    findDescendants(id)

    // Fetch all files in these folders to clean up storage
    const { data: arquivosToDelete } = await supabase
      .from('arquivos')
      .select('storage_path')
      .in('pasta_id', allFolderIds)

    if (arquivosToDelete && arquivosToDelete.length > 0) {
      const paths = arquivosToDelete.map(a => a.storage_path)
      await supabase.storage.from('materias-arquivos').remove(paths)
    }

    // Delete the folder (cascade handles children and arquivo rows)
    const { error } = await supabase
      .from('pastas')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Update local state
    setPastas(prev => prev.filter(p => !allFolderIds.includes(p.id)))
    setArquivos(prev => prev.filter(a => !allFolderIds.includes(a.pasta_id)))
  }

  const ensureRootFolder = async (materiaId: string, materiaNome: string): Promise<Pasta> => {
    // Check if root folder already exists
    const { data: existing } = await supabase
      .from('pastas')
      .select('*')
      .eq('materia_id', materiaId)
      .is('parent_id', null)
      .single()

    if (existing) return existing

    // Create root folder
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('pastas')
      .insert({
        user_id: user.id,
        materia_id: materiaId,
        parent_id: null,
        nome: materiaNome,
      })
      .select()
      .single()

    if (error) throw error
    setPastas(prev => [...prev, data])
    return data
  }

  // --- Arquivos ---

  const fetchArquivos = useCallback(async (pastaId: string) => {
    const { data, error } = await supabase
      .from('arquivos')
      .select('*')
      .eq('pasta_id', pastaId)
      .order('nome')

    if (error) {
      console.error('Error fetching arquivos:', error)
    } else {
      setArquivos(data || [])
    }
  }, [supabase])

  const uploadArquivo = async (file: File, pastaId: string, materiaId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const ext = file.name.split('.').pop() || 'bin'
    const randomId = Math.random().toString(36).slice(2)
    const storagePath = `${user.id}/${materiaId}/${pastaId}/${Date.now()}_${randomId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('materias-arquivos')
      .upload(storagePath, file)

    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from('arquivos')
      .insert({
        user_id: user.id,
        pasta_id: pastaId,
        nome: file.name,
        nome_original: file.name,
        tamanho: file.size,
        tipo_mime: file.type || 'application/octet-stream',
        storage_path: storagePath,
      })
      .select()
      .single()

    if (error) throw error
    setArquivos(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    return data
  }

  const downloadArquivo = async (arquivo: Arquivo) => {
    const { data, error } = await supabase.storage
      .from('materias-arquivos')
      .createSignedUrl(arquivo.storage_path, 60)

    if (error) throw error

    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = arquivo.nome
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renameArquivo = async (id: string, nome: string) => {
    const { data, error } = await supabase
      .from('arquivos')
      .update({ nome })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setArquivos(prev => prev.map(a => a.id === id ? data : a))
    return data
  }

  const deleteArquivo = async (id: string, storagePath: string) => {
    await supabase.storage.from('materias-arquivos').remove([storagePath])

    const { error } = await supabase
      .from('arquivos')
      .delete()
      .eq('id', id)

    if (error) throw error
    setArquivos(prev => prev.filter(a => a.id !== id))
  }

  return {
    pastas, arquivos, loading,
    fetchPastas, fetchArquivos,
    addPasta, renamePasta, deletePasta,
    uploadArquivo, renameArquivo, deleteArquivo,
    downloadArquivo,
    ensureRootFolder,
  }
}
