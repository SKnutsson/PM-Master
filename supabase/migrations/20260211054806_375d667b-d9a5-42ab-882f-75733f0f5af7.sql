-- Add year column to forecast_months with default 2026 for existing data
ALTER TABLE public.forecast_months 
ADD COLUMN year integer NOT NULL DEFAULT 2026;

-- Create an index for efficient year-based queries
CREATE INDEX idx_forecast_months_year ON public.forecast_months(year);

-- Update the unique constraint to include year (if one exists, drop it first)
-- Add a unique constraint for forecast_id + month + year
ALTER TABLE public.forecast_months 
ADD CONSTRAINT forecast_months_forecast_year_month_unique UNIQUE (forecast_id, year, month);