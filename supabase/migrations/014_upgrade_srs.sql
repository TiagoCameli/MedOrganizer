-- Upgrade SRS: add card status, lapses, learning step tracking
ALTER TABLE flashcards
  ADD COLUMN status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'learning', 'review', 'relearning')),
  ADD COLUMN lapses INT NOT NULL DEFAULT 0,
  ADD COLUMN learning_step INT NOT NULL DEFAULT 0;

-- Migrate existing cards: cards with repetitions > 0 are already in review
UPDATE flashcards SET status = 'review' WHERE repetitions > 0;

-- Change quality constraint from (0, 3, 5) to (1, 2, 3, 4)
ALTER TABLE flashcard_reviews DROP CONSTRAINT flashcard_reviews_quality_check;
ALTER TABLE flashcard_reviews ADD CONSTRAINT flashcard_reviews_quality_check
  CHECK (quality IN (1, 2, 3, 4));

-- Migrate existing review data to new quality scale
UPDATE flashcard_reviews SET quality = 1 WHERE quality = 0;
UPDATE flashcard_reviews SET quality = 4 WHERE quality = 5;
-- quality = 3 stays as 3 (maps to "Bom")

-- Add time_taken column (milliseconds user took to answer, nullable for old reviews)
ALTER TABLE flashcard_reviews ADD COLUMN time_taken INT;
