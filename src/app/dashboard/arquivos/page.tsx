'use client'

import { useState, useMemo, useRef } from 'react'
import { useMaterias } from '@/hooks/useMaterias'
import { useArquivos } from '@/hooks/useArquivos'
import { Pasta, Arquivo } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FolderOpen, Folder, FileText, Image, FileSpreadsheet, FileCode,
  File, Upload, FolderPlus, Trash2, Pencil, Download,
  ChevronRight, Loader2, ArrowLeft, Music, Video,
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
  } = useArquivos()

  // Navigation state
  const [selectedMateriaId, setSelectedMateriaId] = useState<string | null>(null)
  const [currentPastaId, setCurrentPastaId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<Pasta[]>([])

  // UI state
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ type: 'pasta' | 'arquivo'; id: string; nome: string } | null>(null)
  const [renameName, setRenameName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Subfolders of current folder
  const currentSubfolders = useMemo(() => {
    return pastas.filter(p => p.parent_id === currentPastaId)
  }, [pastas, currentPastaId])

  // Select a matéria and navigate into its root folder
  const handleSelectMateria = async (materiaId: string) => {
    const materia = materias.find(m => m.id === materiaId)
    if (!materia) return

    setSelectedMateriaId(materiaId)
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

  // Breadcrumb navigation
  const handleBreadcrumbClick = async (index: number) => {
    if (index === -1) {
      // Back to matéria selection
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

  // Loading
  if (materiasLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // Matéria selection view
  if (!selectedMateriaId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Arquivos</h1>
          <p className="text-muted-foreground">Gerencie seus arquivos organizados por matéria</p>
        </div>

        {materias.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma matéria cadastrada</p>
            <p className="text-sm text-muted-foreground">Cadastre matérias para organizar seus arquivos</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materias.map(m => (
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
                    {m.professor && (
                      <p className="text-xs text-muted-foreground truncate">{m.professor}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
