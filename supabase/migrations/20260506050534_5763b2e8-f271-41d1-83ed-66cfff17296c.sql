ALTER TABLE public.project_kpi_metrics
  ADD COLUMN IF NOT EXISTS ftr_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS missing_article_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS inspection_remark_details jsonb NOT NULL DEFAULT '[]'::jsonb;