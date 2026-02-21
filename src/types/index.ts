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
  materia_id: string
  titulo: string
  tipo: 'prova' | 'trabalho' | 'tarefa'
  descricao: string | null
  data_entrega: string
  concluido: boolean
  created_at: string
  materia?: Materia
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
