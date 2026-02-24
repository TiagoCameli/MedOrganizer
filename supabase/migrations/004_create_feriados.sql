-- Tabela para armazenar feriados da faculdade
CREATE TABLE feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_feriado UNIQUE (user_id, data)
);

CREATE INDEX idx_feriados_user_id ON feriados(user_id);
CREATE INDEX idx_feriados_data ON feriados(data);

ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feriados"
  ON feriados FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feriados"
  ON feriados FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feriados"
  ON feriados FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feriados"
  ON feriados FOR DELETE USING (auth.uid() = user_id);
