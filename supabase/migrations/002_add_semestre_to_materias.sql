-- Adiciona coluna semestre à tabela materias (1 a 12)
ALTER TABLE materias ADD COLUMN semestre INT CHECK (semestre BETWEEN 1 AND 12);
