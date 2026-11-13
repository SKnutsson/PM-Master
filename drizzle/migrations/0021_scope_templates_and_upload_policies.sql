DROP POLICY IF EXISTS "review_templates_select" ON public.review_templates;
CREATE POLICY "review_templates_select" ON public.review_templates FOR SELECT TO authenticated USING (public.has_workspace_profile((SELECT auth.uid())));
DROP POLICY IF EXISTS "ata insert" ON storage.objects;
CREATE POLICY "ata insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ata-attachments' AND public.has_workspace_profile((SELECT auth.uid())) AND owner_id = (SELECT auth.uid()::text));
DROP POLICY IF EXISTS "Authenticated can upload project review attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload project review attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-review-attachments' AND public.has_workspace_profile((SELECT auth.uid())) AND owner_id = (SELECT auth.uid()::text));