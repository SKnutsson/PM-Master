ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_access_crm boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linked_salesperson text;