-- =============================================
-- MedOrganizer - Schema Inicial
-- =============================================

-- Tabela: materias
CREATE TABLE materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  professor TEXT,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_materias_user_id ON materias(user_id);

ALTER TABLE materias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own materias"
  ON materias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own materias"
  ON materias FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own materias"
  ON materias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own materias"
  ON materias FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela: horarios
CREATE TABLE horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  local TEXT,
  CONSTRAINT hora_fim_after_inicio CHECK (hora_fim > hora_inicio)
);

CREATE INDEX idx_horarios_user_id ON horarios(user_id);
CREATE INDEX idx_horarios_materia_id ON horarios(materia_id);
CREATE INDEX idx_horarios_dia_semana ON horarios(dia_semana);

ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own horarios"
  ON horarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own horarios"
  ON horarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own horarios"
  ON horarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own horarios"
  ON horarios FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela: eventos
CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('prova', 'trabalho', 'tarefa')),
  descricao TEXT,
  data_entrega TIMESTAMPTZ NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_user_id ON eventos(user_id);
CREATE INDEX idx_eventos_materia_id ON eventos(materia_id);
CREATE INDEX idx_eventos_data_entrega ON eventos(data_entrega);
CREATE INDEX idx_eventos_tipo ON eventos(tipo);

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own eventos"
  ON eventos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eventos"
  ON eventos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own eventos"
  ON eventos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own eventos"
  ON eventos FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela: notas
CREATE TABLE notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  nota DECIMAL(5,2) NOT NULL CHECK (nota >= 0),
  peso DECIMAL(5,2) NOT NULL DEFAULT 1.0 CHECK (peso > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_user_id ON notas(user_id);
CREATE INDEX idx_notas_materia_id ON notas(materia_id);

ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notas"
  ON notas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notas"
  ON notas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notas"
  ON notas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notas"
  ON notas FOR DELETE
  USING (auth.uid() = user_id);
