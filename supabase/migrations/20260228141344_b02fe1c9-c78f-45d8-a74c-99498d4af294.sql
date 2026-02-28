
CREATE TABLE public.forecast_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID REFERENCES public.forecasts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'status_change', 'month_moved', 'amount_changed', 'deleted'
  project_name TEXT NOT NULL,
  product_name TEXT,
  old_value TEXT,
  new_value TEXT,
  details TEXT,
  changed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read forecast_events"
  ON public.forecast_events FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert forecast_events"
  ON public.forecast_events FOR INSERT WITH CHECK (true);

CREATE INDEX idx_forecast_events_created_at ON public.forecast_events(created_at DESC);
