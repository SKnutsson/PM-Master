CREATE TABLE public.project_closeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  signed_off boolean NOT NULL DEFAULT false,
  signed_by_name text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_closeouts TO authenticated;
GRANT ALL ON public.project_closeouts TO service_role;
ALTER TABLE public.project_closeouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace select closeouts" ON public.project_closeouts FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace insert closeouts" ON public.project_closeouts FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace update closeouts" ON public.project_closeouts FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace delete closeouts" ON public.project_closeouts FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE TRIGGER trg_closeouts_updated BEFORE UPDATE ON public.project_closeouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "auth read services" ON public.services;
DROP POLICY IF EXISTS "auth insert services" ON public.services;
DROP POLICY IF EXISTS "auth update services" ON public.services;
DROP POLICY IF EXISTS "auth delete services" ON public.services;
CREATE POLICY "workspace read services" ON public.services FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace update services" ON public.services FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace delete services" ON public.services FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));

DROP POLICY IF EXISTS "auth read sci" ON public.service_checklist_items;
DROP POLICY IF EXISTS "auth insert sci" ON public.service_checklist_items;
DROP POLICY IF EXISTS "auth update sci" ON public.service_checklist_items;
DROP POLICY IF EXISTS "auth delete sci" ON public.service_checklist_items;
CREATE POLICY "workspace read sci" ON public.service_checklist_items FOR SELECT TO authenticated USING (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace insert sci" ON public.service_checklist_items FOR INSERT TO authenticated WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace update sci" ON public.service_checklist_items FOR UPDATE TO authenticated USING (public.has_workspace_profile(auth.uid())) WITH CHECK (public.has_workspace_profile(auth.uid()));
CREATE POLICY "workspace delete sci" ON public.service_checklist_items FOR DELETE TO authenticated USING (public.has_workspace_profile(auth.uid()));

DROP POLICY IF EXISTS "Auth read service-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth update service-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete service-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload service-attachments" ON storage.objects;
CREATE POLICY "Workspace read service-attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'service-attachments' AND public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace upload service-attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-attachments' AND public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace update service-attachments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'service-attachments' AND public.has_workspace_profile(auth.uid()));
CREATE POLICY "Workspace delete service-attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'service-attachments' AND public.has_workspace_profile(auth.uid()));