CREATE POLICY "Authenticated can read project review attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-review-attachments');

CREATE POLICY "Authenticated can upload project review attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-review-attachments');

CREATE POLICY "Authenticated can update project review attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-review-attachments')
WITH CHECK (bucket_id = 'project-review-attachments');

CREATE POLICY "Authenticated can delete project review attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-review-attachments');