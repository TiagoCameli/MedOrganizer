export interface Materia {
  id: string
  user_id: string
  nome: string
  professor: string | null
  semestre: number | null
  cor: string
  created_at: string
}

export interface Horario {
  id: string
  user_id: string
  materia_id: string
  dia_semana: number // 0=Domingo, 1=Segunda ... 6=Sábado
  hora_inicio: string // HH:MM:SS
  hora_fim: string
  local: string | null
  materia?: Materia
}

export interface Evento {
  id: string
  user_id: string
  materia_ids: string[]
  titulo: string
  tipo: 'prova' | 'trabalho' | 'tarefa'
  descricao: string | null
  data_entrega: string
  concluido: boolean
  created_at: string
}

export interface Semestre {
  id: string
  user_id: string
  numero: number
  data_inicio: string
  data_fim: string
  created_at: string
}

export interface Nota {
  id: string
  user_id: string
  materia_id: string
  descricao: string
  nota: number
  peso: number
  created_at: string
}

export interface Feriado {
  id: string
  user_id: string
  data: string // YYYY-MM-DD
  descricao: string
  created_at: string
}

export interface Conteudo {
  id: string
  user_id: string
  materia_id: string
  nome: string
  created_at: string
}

export type FlashcardType = 'basico' | 'basico_invertido' | 'cloze'

export type CardStatus = 'new' | 'learning' | 'review' | 'relearning'

export interface Flashcard {
  id: string
  user_id: string
  materia_id: string
  conteudo_id: string | null
  pergunta: string
  resposta: string
  type: FlashcardType
  group_id: string | null
  card_index: number | null
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review: string
  status: CardStatus
  lapses: number
  learning_step: number
  attachment_url?: string | null
  created_at: string
}

export interface FlashcardGroup {
  group_id: string | null
  type: FlashcardType
  cards: Flashcard[]
  display_pergunta: string
  display_resposta: string
  card_count: number
}

export type StudyQuality = 1 | 2 | 3 | 4

export interface FlashcardReview {
  id: string
  user_id: string
  flashcard_id: string
  quality: StudyQuality
  ease_factor_before: number
  ease_factor_after: number
  interval_before: number
  interval_after: number
  time_taken?: number | null
  reviewed_at: string
}

export interface WeaknessTopic {
  id: string
  user_id: string
  materia_id: string
  conteudo_id: string | null
  difficulty: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReviewStats {
  materia_id: string
  materia_nome: string
  materia_cor: string
  total: number
  due: number
  learned: number
  new_cards: number
  learning_cards: number
  mature_cards: number
  retention_rate: number
  avg_interval: number
}

export interface ConteudoWeaknessStats {
  conteudo_id: string | null
  conteudo_nome: string | null
  materia_id: string
  materia_nome: string
  materia_cor: string
  total_reviews: number
  errors: number
  error_rate: number
  last_reviewed: string | null
}

export interface StudySession {
  id: string
  user_id: string
  materia_id: string
  conteudo_id?: string | null
  duration_minutes: number
  studied_at: string // YYYY-MM-DD
  created_at: string
}

export interface StudyGoal {
  id: string
  user_id: string
  materia_id: string
  horas_meta: number
  tipo: 'semanal' | 'mensal'
  created_at: string
}

export interface Pasta {
  id: string
  user_id: string
  materia_id: string
  parent_id: string | null
  nome: string
  created_at: string
}

export interface Arquivo {
  id: string
  user_id: string
  pasta_id: string
  nome: string
  nome_original: string
  tamanho: number
  tipo_mime: string
  storage_path: string
  created_at: string
}
