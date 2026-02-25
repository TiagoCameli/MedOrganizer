'use client'

import { useState, useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { buildClozeTemplate, parseClozeMarkers, renderClozeQuestion } from '@/lib/cloze'

interface ClozeEditorProps {
  value: string
  onChange: (annotatedTemplate: string) => void
}

export default function ClozeEditor({ value, onChange }: ClozeEditorProps) {
  const [rawText, setRawText] = useState('')
  // Map<wordIndex, clozeNumber>
  const [selectedWords, setSelectedWords] = useState<Map<number, number>>(new Map())
  const [nextClozeNum, setNextClozeNum] = useState(1)

  const words = useMemo(() => {
    return rawText.split(/\s+/).filter(w => w.length > 0)
  }, [rawText])

  const handleTextChange = (text: string) => {
    setRawText(text)
    setSelectedWords(new Map())
    setNextClozeNum(1)
    onChange('')
  }

  const toggleWord = (wordIdx: number) => {
    const newSelected = new Map(selectedWords)

    if (newSelected.has(wordIdx)) {
      const removedNum = newSelected.get(wordIdx)!
      newSelected.delete(wordIdx)

      // Renumber: shift down all cloze numbers greater than the removed one
      const renumbered = new Map<number, number>()
      for (const [idx, num] of newSelected) {
        renumbered.set(idx, num > removedNum ? num - 1 : num)
      }

      setSelectedWords(renumbered)
      setNextClozeNum(prev => prev - 1)

      const template = buildClozeTemplate(rawText, renumbered)
      onChange(template)
    } else {
      newSelected.set(wordIdx, nextClozeNum)
      setSelectedWords(newSelected)
      setNextClozeNum(prev => prev + 1)

      const template = buildClozeTemplate(rawText, newSelected)
      onChange(template)
    }
  }

  const template = value
  const markers = template ? parseClozeMarkers(template) : []

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texto completo</Label>
        <Textarea
          value={rawText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Digite o texto completo aqui. Ex: A mitocondria é responsável pela respiração celular e contém DNA próprio"
          rows={3}
        />
      </div>

      {words.length > 0 && (
        <div className="space-y-2">
          <Label>Clique nas palavras para omitir</Label>
          <div className="flex flex-wrap gap-1.5 p-3 border rounded-lg bg-muted/30 min-h-[60px]">
            {words.map((word, idx) => {
              const clozeNum = selectedWords.get(idx)
              const isSelected = clozeNum !== undefined

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleWord(idx)}
                  className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-background border border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                  }`}
                >
                  {word}
                  {isSelected && (
                    <span className="ml-1 text-xs opacity-80">[{clozeNum}]</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="p-2.5 border rounded-lg bg-background text-sm space-y-2">
            <div>
              <Badge variant="secondary" className="text-xs mb-1">Pergunta</Badge>
              <p className="text-muted-foreground">{renderClozeQuestion(template)}</p>
            </div>
            <div>
              <Badge variant="secondary" className="text-xs mb-1">Resposta</Badge>
              <p className="text-muted-foreground">
                {markers.map(m => m.word).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
