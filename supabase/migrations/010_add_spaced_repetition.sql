-- Migration 010: Add spaced repetition (SM-2) support
-- Adds SM-2 columns to flashcards and creates flashcard_reviews table

-- SM-2 columns on flashcards (defaults make existing cards "new" and due today)
ALTER TABLE flashcards
  ADD COLUMN ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  ADD COLUMN interval_days INT NOT NULL DEFAULT 0,
  ADD COLUMN repetitions INT NOT NULL DEFAULT 0,
  ADD COLUMN next_review DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX idx_flashcards_next_review ON flashcards(next_review);

-- Review history table
CREATE TABLE flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  quality INT NOT NULL CHECK (quality IN (0, 3, 5)),
  ease_factor_before DECIMAL(4,2) NOT NULL,
  ease_factor_after DECIMAL(4,2) NOT NULL,
  interval_before INT NOT NULL,
  interval_after INT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcard_reviews_user ON flashcard_reviews(user_id);
CREATE INDEX idx_flashcard_reviews_flashcard ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_flashcard_reviews_reviewed_at ON flashcard_reviews(reviewed_at);

-- RLS for flashcard_reviews
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews"
  ON flashcard_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reviews"
  ON flashcard_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON flashcard_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON flashcard_reviews FOR DELETE
  USING (auth.uid() = user_id);
