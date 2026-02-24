-- Coluna para URL do anexo
ALTER TABLE flashcards ADD COLUMN attachment_url TEXT;

-- Bucket público para anexos de flashcards
INSERT INTO storage.buckets (id, name, public)
VALUES ('flashcard-attachments', 'flashcard-attachments', true);

-- Upload: apenas o próprio usuário (pasta = user_id)
CREATE POLICY "Users upload own attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'flashcard-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]);

-- Leitura pública (bucket é público)
CREATE POLICY "Public read attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'flashcard-attachments');

-- Delete: apenas o próprio usuário
CREATE POLICY "Users delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'flashcard-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]);
