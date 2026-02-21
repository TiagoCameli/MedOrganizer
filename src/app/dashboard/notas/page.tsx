'use client'

import { useState, useEffect } from 'react'
import { useNotas } from '@/hooks/useNotas'
import { useMaterias } from '@/hooks/useMaterias'
import { Nota } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Plus, Pencil, Trash2, GraduationCap, Calculator, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function NotasPage() {
  const { notas, loading, fetchNotas, addNota, updateNota, deleteNota, calcularMedia, calcularNotaNecessaria } = useNotas()
  const { materias, loading: loadingMaterias } = useMaterias()
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNota, setEditingNota] = useState<Nota | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [descricao, setDescricao] = useState('')
  const [nota, setNota] = useState('')
  const [peso, setPeso] = useState('1')

  // Simulator state
  const [mediaMinima, setMediaMinima] = useState('7')
  const [pesoProxima, setPesoProxima] = useState('1')

  useEffect(() => {
    if (selectedMateria) {
      fetchNotas(selectedMateria)
    }
  }, [selectedMateria, fetchNotas])

  const resetForm = () => {
    setDescricao('')
    setNota('')
    setPeso('1')
    setEditingNota(null)
  }

  const openEdit = (n: Nota) => {
    setEditingNota(n)
    setDescricao(n.descricao)
    setNota(String(n.nota))
    setPeso(String(n.peso))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!descricao.trim()) { toast.error('Descrição é obrigatória'); return }
    if (!nota || isNaN(Number(nota)) || Number(nota) < 0) { toast.error('Nota inválida'); return }
    if (!peso || isNaN(Number(peso)) || Number(peso) <= 0) { toast.error('Peso inválido'); return }
    if (!selectedMateria) { toast.error('Selecione uma matéria'); return }

    setSaving(true)
    try {
      const data = {
        descricao,
        nota: Number(nota),
        peso: Number(peso),
        materia_id: selectedMateria,
      }
      if (editingNota) {
        await updateNota(editingNota.id, data)
        toast.success('Nota atualizada!')
      } else {
        await addNota(data)
        toast.success('Nota adicionada!')
      }
      setDialogOpen(false)
      resetForm()
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta nota?')) return
    try {
      await deleteNota(id)
      toast.success('Nota excluída!')
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const media = calcularMedia()
  const notaNecessaria = calcularNotaNecessaria(Number(mediaMinima), Number(pesoProxima))

  const getMediaColor = (m: number) => {
    if (m >= 7) return 'text-green-600 dark:text-green-400'
    if (m >= 5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getMediaBg = (m: number) => {
    if (m >= 7) return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
    if (m >= 5) return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
    return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
  }

  const selectedMateriaObj = materias.find(m => m.id === selectedMateria)

  if (loadingMaterias) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notas</h1>
          <p className="text-muted-foreground">Controle suas notas e médias</p>
        </div>
        {selectedMateria && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Nova Nota
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingNota ? 'Editar Nota' : 'Nova Nota'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Prova 1, Trabalho 2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nota *</Label>
                    <Input type="number" step="0.1" min="0" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex: 8.5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso</Label>
                    <Input type="number" step="0.1" min="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 1.0" />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingNota ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Materia selector */}
      <div className="space-y-2">
        <Label>Selecione a matéria</Label>
        <Select value={selectedMateria} onValueChange={setSelectedMateria}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Escolha uma matéria" />
          </SelectTrigger>
          <SelectContent>
            {materias.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.cor }} />
                  {m.nome}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedMateria ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Selecione uma matéria para ver e gerenciar suas notas
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Media card */}
          {notas.length > 0 && (
            <Card className={`border-2 ${getMediaBg(media)}`}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Média Ponderada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedMateriaObj?.nome}
                  </p>
                </div>
                <div className={`text-4xl font-bold ${getMediaColor(media)}`}>
                  {media.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas table */}
          {notas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <GraduationCap className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma nota cadastrada para esta matéria.<br />
                  Adicione sua primeira nota!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Nota</TableHead>
                      <TableHead className="text-center">Peso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notas.map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.descricao}</TableCell>
                        <TableCell className={`text-center font-semibold ${getMediaColor(n.nota)}`}>
                          {n.nota.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center">{n.peso.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(n)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Grade simulator */}
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-indigo-600" />
                Simulador: Quanto preciso tirar?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nota mínima para aprovação</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={mediaMinima}
                    onChange={(e) => setMediaMinima(e.target.value)}
                    placeholder="Ex: 7.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peso da próxima avaliação</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={pesoProxima}
                    onChange={(e) => setPesoProxima(e.target.value)}
                    placeholder="Ex: 1.0"
                  />
                </div>
              </div>

              {notas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Adicione pelo menos uma nota para usar o simulador.
                </p>
              ) : notaNecessaria !== null && (
                <div className={`p-4 rounded-lg border-2 ${
                  notaNecessaria <= 10 && notaNecessaria >= 0
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                    : notaNecessaria > 10
                    ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    : 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                }`}>
                  {notaNecessaria <= 0 ? (
                    <p className="text-green-700 dark:text-green-300 font-medium">
                      Parabéns! Você já atingiu a média mínima de {mediaMinima}. Sua média atual é {media.toFixed(2)}.
                    </p>
                  ) : notaNecessaria > 10 ? (
                    <p className="text-red-700 dark:text-red-300 font-medium">
                      Você precisaria de {notaNecessaria.toFixed(2)} na próxima avaliação (peso {pesoProxima}), o que está acima de 10. A aprovação por média está comprometida.
                    </p>
                  ) : (
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      Você precisa de <span className="text-2xl font-bold">{notaNecessaria.toFixed(2)}</span> na próxima avaliação (peso {pesoProxima}) para atingir a média mínima de {mediaMinima}.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
