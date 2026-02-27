-- =============================================
-- MedOrganizer - Gerenciamento de Arquivos
-- =============================================

-- Tabela: pastas (hierarquia de pastas)
CREATE TABLE pastas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES pastas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pastas_user_id ON pastas(user_id);
CREATE INDEX idx_pastas_materia_id ON pastas(materia_id);
CREATE INDEX idx_pastas_parent_id ON pastas(parent_id);

ALTER TABLE pastas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pastas"
  ON pastas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pastas"
  ON pastas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pastas"
  ON pastas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pastas"
  ON pastas FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela: arquivos (metadados dos arquivos)
CREATE TABLE arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pasta_id UUID NOT NULL REFERENCES pastas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_original TEXT NOT NULL,
  tamanho BIGINT NOT NULL,
  tipo_mime TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_arquivos_user_id ON arquivos(user_id);
CREATE INDEX idx_arquivos_pasta_id ON arquivos(pasta_id);

ALTER TABLE arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own arquivos"
  ON arquivos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own arquivos"
  ON arquivos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own arquivos"
  ON arquivos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own arquivos"
  ON arquivos FOR DELETE
  USING (auth.uid() = user_id);

-- Bucket privado para arquivos de matérias
INSERT INTO storage.buckets (id, name, public)
VALUES ('materias-arquivos', 'materias-arquivos', false);

-- Upload: apenas o próprio usuário
CREATE POLICY "Users upload own materias files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'materias-arquivos'
  AND auth.uid()::text = (storage.foldername(name))[1]);

-- Download: apenas o próprio usuário
CREATE POLICY "Users read own materias files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'materias-arquivos'
  AND auth.uid()::text = (storage.foldername(name))[1]);

-- Delete: apenas o próprio usuário
CREATE POLICY "Users delete own materias files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'materias-arquivos'
  AND auth.uid()::text = (storage.foldername(name))[1]);
