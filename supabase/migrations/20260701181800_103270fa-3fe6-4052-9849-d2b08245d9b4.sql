
CREATE POLICY "production blueprints read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'production-blueprints' AND public.can_access_production(auth.uid()));

CREATE POLICY "production blueprints insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'production-blueprints' AND public.can_access_production(auth.uid()));

CREATE POLICY "production blueprints update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'production-blueprints' AND public.can_access_production(auth.uid()))
  WITH CHECK (bucket_id = 'production-blueprints' AND public.can_access_production(auth.uid()));

CREATE POLICY "production blueprints delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'production-blueprints' AND public.can_access_production(auth.uid()));
