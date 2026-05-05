CREATE TABLE public.project_kpi_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE,
  first_time_right_percent numeric,
  delivery_precision_missing integer,
  inspection_remarks integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_kpi_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read kpi" ON public.project_kpi_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert kpi" ON public.project_kpi_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update kpi" ON public.project_kpi_metrics FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete kpi" ON public.project_kpi_metrics FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_project_kpi_metrics_updated_at
BEFORE UPDATE ON public.project_kpi_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();