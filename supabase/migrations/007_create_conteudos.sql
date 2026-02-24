-- =============================================
-- MedOrganizer - Tabela de Conteúdos (Subcategorias de Matéria)
-- =============================================

CREATE TABLE conteudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conteudos_user_id ON conteudos(user_id);
CREATE INDEX idx_conteudos_materia_id ON conteudos(materia_id);

ALTER TABLE conteudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conteudos"
  ON conteudos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conteudos"
  ON conteudos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conteudos"
  ON conteudos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conteudos"
  ON conteudos FOR DELETE
  USING (auth.uid() = user_id);

-- Adicionar conteudo_id em flashcards (nullable para compatibilidade)
ALTER TABLE flashcards ADD COLUMN conteudo_id UUID REFERENCES conteudos(id) ON DELETE SET NULL;
CREATE INDEX idx_flashcards_conteudo_id ON flashcards(conteudo_id);
