
CREATE INDEX IF NOT EXISTS idx_daily_resource_entries_date ON public.daily_resource_entries(date);
CREATE INDEX IF NOT EXISTS idx_daily_resource_entries_installer_id ON public.daily_resource_entries(installer_id);
CREATE INDEX IF NOT EXISTS idx_daily_resource_entries_project_id ON public.daily_resource_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_sort_order ON public.activities(sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_forecasts_created_at ON public.forecasts(created_at);
CREATE INDEX IF NOT EXISTS idx_forecast_months_forecast_id ON public.forecast_months(forecast_id);
CREATE INDEX IF NOT EXISTS idx_production_objects_factory_id ON public.production_objects(factory_id);
CREATE INDEX IF NOT EXISTS idx_production_flows_project_id ON public.production_flows(project_id);
