ALTER TABLE public.crm_quotes ADD COLUMN IF NOT EXISTS delivery_month date;
ALTER TABLE public.forecasts ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.crm_quotes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS forecasts_quote_id_idx ON public.forecasts(quote_id);