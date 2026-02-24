-- Add flashcard types: basico, basico_invertido, cloze
ALTER TABLE flashcards
  ADD COLUMN type TEXT NOT NULL DEFAULT 'basico'
    CHECK (type IN ('basico', 'basico_invertido', 'cloze')),
  ADD COLUMN group_id UUID,
  ADD COLUMN card_index INT;

CREATE INDEX idx_flashcards_type ON flashcards(type);
CREATE INDEX idx_flashcards_group_id ON flashcards(group_id);
