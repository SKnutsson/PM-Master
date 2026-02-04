-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
$$;

-- Policies for user_roles (only admins can manage roles)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Drop existing permissive policies and create proper authenticated policies

-- Projects policies
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;
CREATE POLICY "Authenticated users can read projects"
ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert projects"
ON public.projects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
ON public.projects FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete projects"
ON public.projects FOR DELETE TO authenticated USING (true);

-- Activities policies
DROP POLICY IF EXISTS "Allow all access to activities" ON public.activities;
CREATE POLICY "Authenticated users can read activities"
ON public.activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert activities"
ON public.activities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update activities"
ON public.activities FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete activities"
ON public.activities FOR DELETE TO authenticated USING (true);

-- Forecasts policies
DROP POLICY IF EXISTS "Allow all access to forecasts" ON public.forecasts;
CREATE POLICY "Authenticated users can read forecasts"
ON public.forecasts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert forecasts"
ON public.forecasts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update forecasts"
ON public.forecasts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete forecasts"
ON public.forecasts FOR DELETE TO authenticated USING (true);

-- Forecast months policies  
DROP POLICY IF EXISTS "Allow all access to forecast_months" ON public.forecast_months;
CREATE POLICY "Authenticated users can read forecast_months"
ON public.forecast_months FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert forecast_months"
ON public.forecast_months FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update forecast_months"
ON public.forecast_months FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete forecast_months"
ON public.forecast_months FOR DELETE TO authenticated USING (true);

-- Schedule history policies
DROP POLICY IF EXISTS "Allow all access to schedule_history" ON public.schedule_history;
CREATE POLICY "Authenticated users can read schedule_history"
ON public.schedule_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert schedule_history"
ON public.schedule_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule_history"
ON public.schedule_history FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete schedule_history"
ON public.schedule_history FOR DELETE TO authenticated USING (true);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, NEW.email);
    
    -- Add default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();