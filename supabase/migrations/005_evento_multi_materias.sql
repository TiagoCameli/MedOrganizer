-- Adiciona suporte a múltiplas matérias por evento

-- 1. Adicionar coluna array
ALTER TABLE eventos ADD COLUMN materia_ids UUID[] NOT NULL DEFAULT '{}';

-- 2. Migrar dados existentes
UPDATE eventos SET materia_ids = ARRAY[materia_id];

-- 3. Remover coluna antiga e seu índice
DROP INDEX IF EXISTS idx_eventos_materia_id;
ALTER TABLE eventos DROP COLUMN materia_id;
