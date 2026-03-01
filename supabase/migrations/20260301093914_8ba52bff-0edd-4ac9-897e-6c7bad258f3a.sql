
-- Add sales_person column to forecasts
ALTER TABLE public.forecasts ADD COLUMN sales_person text;

-- Allow authenticated users to delete forecast_events
CREATE POLICY "Authenticated users can delete forecast_events"
ON public.forecast_events
FOR DELETE
USING (true);

-- Add product_name column if missing (for details in event log)
-- Already exists, skip
