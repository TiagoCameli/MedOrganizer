'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Brain, RotateCcw, AlertTriangle, BarChart3 } from 'lucide-react'
import FlashcardsTab from './FlashcardsTab'
import RevisaoTab from './RevisaoTab'
import PontosFracosTab from './PontosFracosTab'
import EstatisticasTab from './EstatisticasTab'

export default function FlashcardsPage() {
  const [activeTab, setActiveTab] = useState('flashcards')

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="flashcards" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Flashcards</span>
          </TabsTrigger>
          <TabsTrigger value="revisao" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Revisão</span>
          </TabsTrigger>
          <TabsTrigger value="pontos-fracos" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Pontos Fracos</span>
          </TabsTrigger>
          <TabsTrigger value="estatisticas" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Estatísticas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards">
          <FlashcardsTab />
        </TabsContent>
        <TabsContent value="revisao">
          <RevisaoTab />
        </TabsContent>
        <TabsContent value="pontos-fracos">
          <PontosFracosTab />
        </TabsContent>
        <TabsContent value="estatisticas">
          <EstatisticasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
