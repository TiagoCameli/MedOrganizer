-- =============================================
-- MedOrganizer - Adicionar tipo (semanal/mensal) às metas de estudo
-- =============================================

-- Adicionar coluna tipo com default 'semanal' para dados existentes
ALTER TABLE study_goals
  ADD COLUMN tipo TEXT NOT NULL DEFAULT 'semanal'
  CHECK (tipo IN ('semanal', 'mensal'));

-- Substituir constraint única para incluir tipo
ALTER TABLE study_goals DROP CONSTRAINT unique_user_materia_goal;
ALTER TABLE study_goals ADD CONSTRAINT unique_user_materia_goal_tipo UNIQUE (user_id, materia_id, tipo);
