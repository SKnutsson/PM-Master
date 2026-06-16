ALTER TABLE public.project_kpi_metrics
  ADD COLUMN IF NOT EXISTS deviations integer,
  ADD COLUMN IF NOT EXISTS deviation_details jsonb NOT NULL DEFAULT '[]'::jsonb;