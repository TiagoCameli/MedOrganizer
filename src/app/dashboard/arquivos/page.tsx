'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useMaterias } from '@/hooks/useMaterias'
import { useArquivos } from '@/hooks/useArquivos'
import { Pasta, Arquivo } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FolderOpen, Folder, FileText, Image, FileSpreadsheet, FileCode,
  File, Upload, FolderPlus, Trash2, Pencil, Download,
  ChevronRight, Loader2, ArrowLeft, Music, Video, Search, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

function getFileIcon(tipoMime: string) {
  if (tipoMime.startsWith('image/')) return Image
  if (tipoMime === 'application/pdf') return FileText
  if (tipoMime.startsWith('video/')) return Video
  if (tipoMime.startsWith('audio/')) return Music
  if (tipoMime.includes('spreadsheet') || tipoMime.includes('excel')) return FileSpreadsheet
  if (tipoMime.includes('json') || tipoMime.includes('javascript') || tipoMime.includes('html')) return FileCode
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function ArquivosPage() {
  const { materias, loading: materiasLoading } = useMaterias()
  const {
    pastas, arquivos, loading,
    fetchPastas, fetchArquivos,
    addPasta, renamePasta, deletePasta,
    uploadArquivo, renameArquivo, deleteArquivo,
    downloadArquivo, ensureRootFolder,
    searchPastas, searchArquivos, searching,
    searchAll, clearSearch,
  } = useArquivos()

  // Navigation state
  const [selectedMateriaId, setSelectedMateriaId] = useState<string | null>(null)
  const [currentPastaId, setCurrentPastaId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Pasta[]>([])

  // Filter state
  const [filterSemestre, setFilterSemestre] = useState<string>('all')
  const [filterMateria, setFilterMateria] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UI state
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ type: 'pasta' | 'arquivo'; id: string; nome: string } | null>(null)
  const [renameName, setRenameName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Available semesters
  const semestres = useMemo(() => {
    const set = new Set(materias.map(m => m.semestre).filter((s): s is number => s !== null))
    return Array.from(set).sort((a, b) => a - b)
  }, [materias])

  // Filtered matérias for the grid
  const filteredMaterias = useMemo(() => {
    let result = materias

    if (filterSemestre !== 'all') {
      result = result.filter(m => m.semestre === Number(filterSemestre))
    }

    if (filterMateria !== 'all') {
      result = result.filter(m => m.id === filterMateria)
    }

    return result
  }, [materias, filterSemestre, filterMateria])

  // Matérias available for the matéria filter (scoped by selected semester)
  const materiasForFilter = useMemo(() => {
    if (filterSemestre === 'all') return materias
    return materias.filter(m => m.semestre === Number(filterSemestre))
  }, [materias, filterSemestre])

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (!searchQuery.trim()) {
      clearSearch()
      return
    }

    searchTimerRef.current = setTimeout(() => {
      // Scope search by active filters
      let materiaIds: string[] | undefined
      if (filterMateria !== 'all') {
        materiaIds = [filterMateria]
      } else if (filterSemestre !== 'all') {
        materiaIds = materias
          .filter(m => m.semestre === Number(filterSemestre))
          .map(m => m.id)
      }
      searchAll(searchQuery, materiaIds)
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery, filterMateria, filterSemestre]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset matéria filter when semester changes
  useEffect(() => {
    if (filterMateria !== 'all') {
      const mat = materias.find(m => m.id === filterMateria)
      if (mat && filterSemestre !== 'all' && mat.semestre !== Number(filterSemestre)) {
        setFilterMateria('all')
      }
    }
  }, [filterSemestre]) // eslint-disable-line react-hooks/exhaustive-deps

  const isSearching = searchQuery.trim().length > 0

  // Subfolders of current folder
  const currentSubfolders = useMemo(() => {
    return pastas.filter(p => p.parent_id === currentPastaId)
  }, [pastas, currentPastaId])

  // Select a matéria and navigate into its root folder
  const handleSelectMateria = async (materiaId: string) => {
    const materia = materias.find(m => m.id === materiaId)
    if (!materia) return

    setSelectedMateriaId(materiaId)
    setSearchQuery('')
    clearSearch()
    try {
      const rootFolder = await ensureRootFolder(materiaId, materia.nome)
      setCurrentPastaId(rootFolder.id)
      setBreadcrumbs([rootFolder])
      await fetchPastas(materiaId)
      await fetchArquivos(rootFolder.id)
    } catch {
      toast.error('Erro ao abrir pasta da matéria')
    }
  }

  // Navigate into a subfolder
  const handleOpenFolder = async (pasta: Pasta) => {
    setCurrentPastaId(pasta.id)
    setBreadcrumbs(prev => [...prev, pasta])
    await fetchArquivos(pasta.id)
  }

  // Navigate to a search result folder
  const handleNavigateToFolder = async (pasta: Pasta) => {
    const materia = materias.find(m => m.id === pasta.materia_id)
    if (!materia) return

    setSelectedMateriaId(pasta.materia_id)
    setSearchQuery('')
    clearSearch()

    const rootFolder = await ensureRootFolder(pasta.materia_id, materia.nome)
    await fetchPastas(pasta.materia_id)

    // Build breadcrumbs from root to this folder
    const crumbs: Pasta[] = [rootFolder]
    // We need all pastas for this matéria to build the path
    const { data: allPastas } = await (await import('@/lib/supabase/client')).createClient()
      .from('pastas')
      .select('*')
      .eq('materia_id', pasta.materia_id)

    if (allPastas) {
      const buildPath = (targetId: string): Pasta[] => {
        const target = allPastas.find(p => p.id === targetId)
        if (!target || !target.parent_id) return []
        const parentPath = buildPath(target.parent_id)
        return [...parentPath, target]
      }
      const path = buildPath(pasta.id)
      crumbs.push(...path)
    }

    setCurrentPastaId(pasta.id)
    setBreadcrumbs(crumbs)
    await fetchArquivos(pasta.id)
  }

  // Navigate to a search result file's folder
  const handleNavigateToFile = async (arquivo: Arquivo) => {
    // Find the pasta this file belongs to
    const { data: pastaData } = await (await import('@/lib/supabase/client')).createClient()
      .from('pastas')
      .select('*')
      .eq('id', arquivo.pasta_id)
      .single()

    if (!pastaData) return

    const materia = materias.find(m => m.id === pastaData.materia_id)
    if (!materia) return

    setSelectedMateriaId(pastaData.materia_id)
    setSearchQuery('')
    clearSearch()

    const rootFolder = await ensureRootFolder(pastaData.materia_id, materia.nome)
    await fetchPastas(pastaData.materia_id)

    // Build breadcrumbs
    const crumbs: Pasta[] = [rootFolder]
    const { data: allPastas } = await (await import('@/lib/supabase/client')).createClient()
      .from('pastas')
      .select('*')
      .eq('materia_id', pastaData.materia_id)

    if (allPastas) {
      const buildPath = (targetId: string): Pasta[] => {
        const target = allPastas.find(p => p.id === targetId)
        if (!target || !target.parent_id) return []
        const parentPath = buildPath(target.parent_id)
        return [...parentPath, target]
      }
      const path = buildPath(pastaData.id)
      crumbs.push(...path)
    }

    setCurrentPastaId(pastaData.id)
    setBreadcrumbs(crumbs)
    await fetchArquivos(pastaData.id)
  }

  // Breadcrumb navigation
  const handleBreadcrumbClick = async (index: number) => {
    if (index === -1) {
      setSelectedMateriaId(null)
      setCurrentPastaId(null)
      setBreadcrumbs([])
      return
    }
    const target = breadcrumbs[index]
    setCurrentPastaId(target.id)
    setBreadcrumbs(prev => prev.slice(0, index + 1))
    await fetchArquivos(target.id)
  }

  // Create subfolder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedMateriaId || !currentPastaId) return
    setSaving(true)
    try {
      await addPasta(newFolderName.trim(), selectedMateriaId, currentPastaId)
      toast.success('Pasta criada')
      setNewFolderDialogOpen(false)
      setNewFolderName('')
    } catch {
      toast.error('Erro ao criar pasta')
    }
    setSaving(false)
  }

  // Rename
  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return
    setSaving(true)
    try {
      if (renameTarget.type === 'pasta') {
        await renamePasta(renameTarget.id, renameName.trim())
      } else {
        await renameArquivo(renameTarget.id, renameName.trim())
      }
      toast.success('Renomeado com sucesso')
      setRenameDialogOpen(false)
      setRenameTarget(null)
      setRenameName('')
    } catch {
      toast.error('Erro ao renomear')
    }
    setSaving(false)
  }

  // Delete folder
  const handleDeleteFolder = async (pasta: Pasta) => {
    if (!confirm(`Deletar pasta "${pasta.nome}" e todo seu conteúdo?`)) return
    try {
      await deletePasta(pasta.id)
      toast.success('Pasta deletada')
    } catch {
      toast.error('Erro ao deletar pasta')
    }
  }

  // Delete file
  const handleDeleteFile = async (arquivo: Arquivo) => {
    if (!confirm(`Deletar "${arquivo.nome}"?`)) return
    try {
      await deleteArquivo(arquivo.id, arquivo.storage_path)
      toast.success('Arquivo deletado')
    } catch {
      toast.error('Erro ao deletar arquivo')
    }
  }

  // Upload files
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !currentPastaId || !selectedMateriaId) return

    const oversized = Array.from(files).filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      toast.error(`Arquivo(s) muito grande(s) (máx 50MB): ${oversized.map(f => f.name).join(', ')}`)
      e.target.value = ''
      return
    }

    setUploading(true)
    let success = 0
    for (const file of Array.from(files)) {
      try {
        await uploadArquivo(file, currentPastaId, selectedMateriaId)
        success++
      } catch {
        toast.error(`Erro ao enviar "${file.name}"`)
      }
    }
    if (success > 0) {
      toast.success(`${success} arquivo(s) enviado(s)`)
    }
    setUploading(false)
    e.target.value = ''
  }

  // Download
  const handleDownload = async (arquivo: Arquivo) => {
    try {
      await downloadArquivo(arquivo)
    } catch {
      toast.error('Erro ao baixar arquivo')
    }
  }

  // Open rename dialog
  const openRenameDialog = (type: 'pasta' | 'arquivo', id: string, nome: string) => {
    setRenameTarget({ type, id, nome })
    setRenameName(nome)
    setRenameDialogOpen(true)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilterSemestre('all')
    setFilterMateria('all')
    setSearchQuery('')
    clearSearch()
  }

  const hasActiveFilters = filterSemestre !== 'all' || filterMateria !== 'all' || searchQuery.trim().length > 0

  // Helper to get matéria info for search results
  const getMateriaInfo = (materiaId: string) => materias.find(m => m.id === materiaId)

  // Loading
  if (materiasLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Matéria selection view (with filters)
  if (!selectedMateriaId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Arquivos</h1>
          <p className="text-muted-foreground">Gerencie seus arquivos organizados por matéria</p>
        </div>

        {/* Filters */}
        {materias.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar pastas e arquivos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); clearSearch() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={filterSemestre} onValueChange={setFilterSemestre}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Semestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos semestres</SelectItem>
                {semestres.map(s => (
                  <SelectItem key={s} value={String(s)}>{s}° Semestre</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMateria} onValueChange={setFilterMateria}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Matéria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas matérias</SelectItem>
                {materiasForFilter.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="self-center">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        )}

        {/* Search results */}
        {isSearching ? (
          searching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {searchPastas.length === 0 && searchArquivos.length === 0 ? (
                <div className="text-center py-16">
                  <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum resultado para &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                <>
                  {/* Search result: Folders */}
                  {searchPastas.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Pastas ({searchPastas.length})
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {searchPastas.map(pasta => {
                          const mat = getMateriaInfo(pasta.materia_id)
                          return (
                            <Card
                              key={pasta.id}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => handleNavigateToFolder(pasta)}
                            >
                              <CardContent className="flex items-center gap-3 p-3">
                                <div
                                  className="rounded-lg p-2"
                                  style={{ backgroundColor: mat ? `${mat.cor}20` : undefined }}
                                >
                                  <Folder className="h-5 w-5" style={{ color: mat?.cor }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{pasta.nome}</p>
                                  {mat && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mat.cor }} />
                                      <span className="text-xs text-muted-foreground truncate">{mat.nome}</span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Search result: Files */}
                  {searchArquivos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Arquivos ({searchArquivos.length})
                      </p>
                      <Card>
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {searchArquivos.map(arquivo => {
                              const IconComponent = getFileIcon(arquivo.tipo_mime)
                              // Find which matéria this file belongs to via its pasta
                              const pasta = searchPastas.find(p => p.id === arquivo.pasta_id)
                              const mat = pasta ? getMateriaInfo(pasta.materia_id) : null
                              return (
                                <div
                                  key={arquivo.id}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                                  onClick={() => handleNavigateToFile(arquivo)}
                                >
                                  <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{arquivo.nome}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{formatFileSize(arquivo.tamanho)}</span>
                                      {mat && (
                                        <>
                                          <span>—</span>
                                          <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mat.cor }} />
                                            <span className="truncate">{mat.nome}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                                    Abrir
                                  </Badge>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          /* Matéria grid */
          <>
            {filteredMaterias.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                {materias.length === 0 ? (
                  <>
                    <p className="text-muted-foreground">Nenhuma matéria cadastrada</p>
                    <p className="text-sm text-muted-foreground">Cadastre matérias para organizar seus arquivos</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Nenhuma matéria encontrada com os filtros selecionados</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMaterias.map(m => (
                  <Card
                    key={m.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectMateria(m.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div
                        className="rounded-lg p-2.5"
                        style={{ backgroundColor: `${m.cor}20` }}
                      >
                        <Folder className="h-6 w-6" style={{ color: m.cor }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.semestre ? `${m.semestre}° Semestre` : ''}
                          {m.semestre && m.professor ? ' — ' : ''}
                          {m.professor || ''}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // File browser view
  const selectedMateria = materias.find(m => m.id === selectedMateriaId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Arquivos</h1>
        <p className="text-muted-foreground">Gerencie seus arquivos organizados por matéria</p>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <button
          onClick={() => handleBreadcrumbClick(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Arquivos
        </button>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium">{crumb.nome}</span>
            ) : (
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.nome}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setNewFolderName(''); setNewFolderDialogOpen(true) }}
        >
          <FolderPlus className="h-4 w-4 mr-1.5" />
          Nova Pasta
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1.5" />
          )}
          {uploading ? 'Enviando...' : 'Upload'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Subfolders */}
          {currentSubfolders.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pastas</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentSubfolders.map(pasta => (
                  <Card
                    key={pasta.id}
                    className="group cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <div
                        className="rounded-lg p-2"
                        style={{ backgroundColor: selectedMateria ? `${selectedMateria.cor}20` : undefined }}
                        onClick={() => handleOpenFolder(pasta)}
                      >
                        <Folder className="h-5 w-5" style={{ color: selectedMateria?.cor }} />
                      </div>
                      <span
                        className="flex-1 text-sm font-medium truncate cursor-pointer"
                        onClick={() => handleOpenFolder(pasta)}
                      >
                        {pasta.nome}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); openRenameDialog('pasta', pasta.id, pasta.nome) }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(pasta) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {arquivos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Arquivos</p>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {arquivos.map(arquivo => {
                      const IconComponent = getFileIcon(arquivo.tipo_mime)
                      return (
                        <div
                          key={arquivo.id}
                          className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{arquivo.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(arquivo.tamanho)} — {format(new Date(arquivo.created_at), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDownload(arquivo)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openRenameDialog('arquivo', arquivo.id, arquivo.nome)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteFile(arquivo)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty state */}
          {currentSubfolders.length === 0 && arquivos.length === 0 && (
            <div className="text-center py-16">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Pasta vazia</p>
              <p className="text-sm text-muted-foreground">Crie uma subpasta ou faça upload de arquivos</p>
            </div>
          )}
        </>
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Nome da pasta</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Ex: Resumos, Provas, Aula 1..."
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear {renameTarget?.type === 'pasta' ? 'Pasta' : 'Arquivo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-input">Novo nome</Label>
              <Input
                id="rename-input"
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRename} disabled={!renameName.trim() || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Renomear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
