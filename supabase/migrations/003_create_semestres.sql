-- Tabela para armazenar período (data início/fim) de cada semestre
CREATE TABLE semestres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero INT NOT NULL CHECK (numero BETWEEN 1 AND 12),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT data_fim_after_inicio CHECK (data_fim > data_inicio),
  CONSTRAINT unique_user_semestre UNIQUE (user_id, numero)
);

CREATE INDEX idx_semestres_user_id ON semestres(user_id);

ALTER TABLE semestres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own semestres"
  ON semestres FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own semestres"
  ON semestres FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own semestres"
  ON semestres FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own semestres"
  ON semestres FOR DELETE USING (auth.uid() = user_id);
