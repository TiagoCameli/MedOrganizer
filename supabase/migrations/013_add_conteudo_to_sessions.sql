ALTER TABLE study_sessions
  ADD COLUMN conteudo_id UUID REFERENCES conteudos(id) ON DELETE SET NULL;
