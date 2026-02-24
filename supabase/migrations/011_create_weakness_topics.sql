-- Migration 011: Create weakness_topics table for tracking weak areas

CREATE TABLE weakness_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  conteudo_id UUID REFERENCES conteudos(id) ON DELETE SET NULL,
  difficulty INT NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weakness_topics_user ON weakness_topics(user_id);
CREATE INDEX idx_weakness_topics_materia ON weakness_topics(materia_id);

-- RLS for weakness_topics
ALTER TABLE weakness_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weakness topics"
  ON weakness_topics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weakness topics"
  ON weakness_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weakness topics"
  ON weakness_topics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weakness topics"
  ON weakness_topics FOR DELETE
  USING (auth.uid() = user_id);
