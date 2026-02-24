-- =============================================
-- MedOrganizer - Tabelas de Rastreamento de Estudo
-- =============================================

-- Tabela: study_sessions (sessões de estudo)
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  studied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_materia_id ON study_sessions(materia_id);
CREATE INDEX idx_study_sessions_studied_at ON study_sessions(studied_at);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study_sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study_sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study_sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study_sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela: study_goals (metas semanais de estudo por matéria)
CREATE TABLE study_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  horas_meta DECIMAL(5,1) NOT NULL CHECK (horas_meta > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_materia_goal UNIQUE (user_id, materia_id)
);

CREATE INDEX idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX idx_study_goals_materia_id ON study_goals(materia_id);

ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study_goals"
  ON study_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study_goals"
  ON study_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study_goals"
  ON study_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study_goals"
  ON study_goals FOR DELETE
  USING (auth.uid() = user_id);
