-- Templates for project reviews
CREATE TABLE public.review_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_type text NOT NULL DEFAULT 'Standardprojekt',
  version integer NOT NULL DEFAULT 1,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_templates TO authenticated;
GRANT ALL ON public.review_templates TO service_role;
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_templates_select" ON public.review_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "review_templates_insert_admin" ON public.review_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "review_templates_update_admin" ON public.review_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "review_templates_delete_admin" ON public.review_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- One review per project (version snapshot of template)
CREATE TABLE public.project_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.review_templates(id),
  template_version integer NOT NULL DEFAULT 1,
  template_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'Ej påbörjad',
  review_date date,
  version integer NOT NULL DEFAULT 1,
  header jsonb NOT NULL DEFAULT '{}'::jsonb,
  general_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_reviews TO authenticated;
GRANT ALL ON public.project_reviews TO service_role;
ALTER TABLE public.project_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_reviews_select" ON public.project_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_reviews_insert" ON public.project_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "project_reviews_update" ON public.project_reviews FOR UPDATE TO authenticated USING (true);
CREATE POLICY "project_reviews_delete_admin" ON public.project_reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Single-value checkpoint answers
CREATE TABLE public.project_review_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.project_reviews(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  item_key text NOT NULL,
  value jsonb,
  status text,
  comment text,
  source text,
  document_ref text,
  revision text,
  page_ref text,
  responsible text,
  deadline date,
  risk_level text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_review_answers TO authenticated;
GRANT ALL ON public.project_review_answers TO service_role;
ALTER TABLE public.project_review_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pra_select" ON public.project_review_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "pra_insert" ON public.project_review_answers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pra_update" ON public.project_review_answers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "pra_delete" ON public.project_review_answers FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_pra_review ON public.project_review_answers(review_id);

-- Repeatable rows (documents, scope, options, requirements, risks, deviations, open points, decisions, changes, attendees, ...)
CREATE TABLE public.project_review_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.project_reviews(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_review_rows TO authenticated;
GRANT ALL ON public.project_review_rows TO service_role;
ALTER TABLE public.project_review_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prr_select" ON public.project_review_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "prr_insert" ON public.project_review_rows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "prr_update" ON public.project_review_rows FOR UPDATE TO authenticated USING (true);
CREATE POLICY "prr_delete" ON public.project_review_rows FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_prr_review_section ON public.project_review_rows(review_id, section_key);

-- Electronic sign-off
CREATE TABLE public.project_review_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.project_reviews(id) ON DELETE CASCADE,
  role text NOT NULL,
  statement text,
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_name text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_review_signoffs TO authenticated;
GRANT ALL ON public.project_review_signoffs TO service_role;
ALTER TABLE public.project_review_signoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prs_select" ON public.project_review_signoffs FOR SELECT TO authenticated USING (true);
CREATE POLICY "prs_insert" ON public.project_review_signoffs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "prs_update" ON public.project_review_signoffs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "prs_delete" ON public.project_review_signoffs FOR DELETE TO authenticated USING (true);

-- Audit trail
CREATE TABLE public.project_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.project_reviews(id) ON DELETE CASCADE,
  actor uuid,
  actor_name text,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.project_review_events TO authenticated;
GRANT ALL ON public.project_review_events TO service_role;
ALTER TABLE public.project_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pre_select" ON public.project_review_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "pre_insert" ON public.project_review_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_pre_review ON public.project_review_events(review_id, created_at DESC);

CREATE TRIGGER trg_review_templates_updated BEFORE UPDATE ON public.review_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_project_reviews_updated BEFORE UPDATE ON public.project_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pra_updated BEFORE UPDATE ON public.project_review_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prr_updated BEFORE UPDATE ON public.project_review_rows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prs_updated BEFORE UPDATE ON public.project_review_signoffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();