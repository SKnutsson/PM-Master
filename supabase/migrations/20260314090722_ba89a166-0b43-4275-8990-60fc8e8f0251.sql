
-- Convert column to text
ALTER TABLE public.forecasts ALTER COLUMN deal_status DROP DEFAULT;
ALTER TABLE public.forecasts ALTER COLUMN deal_status TYPE text USING deal_status::text;

-- Update data to new names
UPDATE public.forecasts SET deal_status = 'Budget' WHERE deal_status = 'Prognos';
UPDATE public.forecasts SET deal_status = 'Offert' WHERE deal_status = 'Ny affär';
UPDATE public.forecasts SET deal_status = 'Order' WHERE deal_status = 'Tagen';
UPDATE public.forecasts SET deal_status = 'Budget' WHERE deal_status = 'Flyttad';

-- Drop old enum
DROP TYPE public.deal_status;

-- Create new enum
CREATE TYPE public.deal_status AS ENUM ('Budget', 'Offert', 'Order', 'Fakturerad', 'Förlorad');

-- Convert back
ALTER TABLE public.forecasts ALTER COLUMN deal_status TYPE public.deal_status USING deal_status::public.deal_status;
ALTER TABLE public.forecasts ALTER COLUMN deal_status SET DEFAULT 'Budget'::public.deal_status;
