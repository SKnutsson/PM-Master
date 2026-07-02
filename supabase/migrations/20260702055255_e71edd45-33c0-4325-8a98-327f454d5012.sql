
ALTER TABLE public.production_objects
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'rounded',
  ADD COLUMN IF NOT EXISTS border_color text,
  ADD COLUMN IF NOT EXISTS border_width numeric NOT NULL DEFAULT 1;

ALTER TABLE public.production_factories
  ADD COLUMN IF NOT EXISTS blueprint_x numeric NOT NULL DEFAULT -600,
  ADD COLUMN IF NOT EXISTS blueprint_y numeric NOT NULL DEFAULT -400,
  ADD COLUMN IF NOT EXISTS blueprint_width numeric NOT NULL DEFAULT 1600,
  ADD COLUMN IF NOT EXISTS blueprint_height numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS blueprint_opacity numeric NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS blueprint_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.production_flows
  ADD COLUMN IF NOT EXISTS routing text NOT NULL DEFAULT 'smoothstep';
