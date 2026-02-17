import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  projects as initialProjects, 
  salesForecast as initialForecast,
  Project, 
  Activity, 
  Status,
  Department
} from '@/data/projectData';

export type DealStatus = 'Tagen' | 'Flyttad' | 'Förlorad' | 'Prognos' | 'Ny affär';

export interface ScheduleChange {
  id: string;
  forecastId: string;
  originalMonth: string;
  newMonth: string;
  originalAmount: number;
  movedAt: string;
}

export interface ExtendedSalesForecast {
  id: string;
  project: string;
  product: string;
  months: { [key: string]: number };
  dealStatus: DealStatus;
  notes?: string;
  scheduleHistory?: ScheduleChange[];
}

export function useDatabaseData() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [forecast, setForecast] = useState<ExtendedSalesForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial data from database
  useEffect(() => {
    loadData();
    
    // Set up realtime subscriptions
    const forecastChannel = supabase
      .channel('forecasts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forecasts' }, () => {
        loadForecasts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forecast_months' }, () => {
        loadForecasts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_history' }, () => {
        loadForecasts();
      })
      .subscribe();

    const projectsChannel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadProjects();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
        loadProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(forecastChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadProjects(), loadForecasts()]);
    setIsLoading(false);
    setIsInitialized(true);
  };

  const loadProjects = async () => {
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (projectsError) {
      console.error('Error loading projects:', projectsError);
      return;
    }

    if (projectsData && projectsData.length > 0) {
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      const projectsWithActivities: Project[] = projectsData.map(p => ({
        id: p.id,
        code: p.code || p.id.substring(0, 8),
        name: p.name,
        status: (p.status === 'Avslutat' ? 'Avslutat' : 'Aktiv') as Project['status'],
        customer: p.customer || '',
        projectManager: (p as any).project_manager || '',
        salesPerson: (p as any).sales_person || '',
        product: (p as any).product || '',
        notes: (p as any).notes || '',
        sortOrder: (p as any).sort_order || 0,
        activities: (activitiesData || [])
          .filter(a => a.project_id === p.id)
          .map(a => ({
            id: a.id,
            name: a.name,
            status: a.status as Status,
            department: 'Projektledare' as Department,
            responsible: a.responsible,
            startDate: a.start_date,
            endDate: a.end_date,
            notes: a.notes,
          }))
      }));
      setProjects(projectsWithActivities);
    } else {
      // Seed with initial data if empty
      await seedInitialProjects();
    }
  };

  const loadForecasts = async () => {
    const { data: forecastsData, error: forecastsError } = await supabase
      .from('forecasts')
      .select('*')
      .order('created_at', { ascending: true });

    if (forecastsError) {
      console.error('Error loading forecasts:', forecastsError);
      return;
    }

    if (forecastsData && forecastsData.length > 0) {
      const { data: monthsData } = await supabase
        .from('forecast_months')
        .select('*');

      const { data: historyData } = await supabase
        .from('schedule_history')
        .select('*')
        .order('moved_at', { ascending: false });

      const forecastsWithMonths: ExtendedSalesForecast[] = forecastsData.map(f => {
        const months: { [key: string]: number } = {};
        (monthsData || [])
          .filter(m => m.forecast_id === f.id)
          .forEach(m => {
            months[m.month] = parseFloat(String(m.amount));
          });

        const scheduleHistory: ScheduleChange[] = (historyData || [])
          .filter(h => h.forecast_id === f.id)
          .map(h => ({
            id: h.id,
            forecastId: h.forecast_id,
            originalMonth: h.original_month,
            newMonth: h.new_month,
            originalAmount: parseFloat(String(h.original_amount)),
            movedAt: h.moved_at,
          }));

        return {
          id: f.id,
          project: f.project,
          product: f.product,
          dealStatus: f.deal_status as DealStatus,
          notes: f.notes || undefined,
          months,
          scheduleHistory,
        };
      });
      setForecast(forecastsWithMonths);
    } else {
      // Seed with initial data if empty
      await seedInitialForecasts();
    }
  };

  const seedInitialProjects = async () => {
    for (const project of initialProjects) {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          name: project.name,
          code: project.code,
          customer: project.name,
          department: 'Projektledare',
          status: 'Pågår',
        })
        .select()
        .single();

      if (error || !newProject) continue;

      for (const activity of project.activities) {
        await supabase.from('activities').insert({
          project_id: newProject.id,
          name: activity.name,
          responsible: activity.responsible,
          status: activity.status,
          start_date: activity.startDate || new Date().toISOString().split('T')[0],
          end_date: activity.endDate || new Date().toISOString().split('T')[0],
          notes: '',
        });
      }
    }
    await loadProjects();
  };

  const seedInitialForecasts = async () => {
    for (const item of initialForecast) {
      const { data: newForecast, error } = await supabase
        .from('forecasts')
        .insert({
          project: item.project,
          product: item.product,
          deal_status: 'Prognos',
          notes: item.notes || null,
        })
        .select()
        .single();

      if (error || !newForecast) continue;

      for (const [month, amount] of Object.entries(item.months)) {
        if (amount > 0) {
          await supabase.from('forecast_months').insert({
            forecast_id: newForecast.id,
            month: month,
            amount: amount,
          });
        }
      }
    }
    await loadForecasts();
  };

  // Project functions
  const addProject = useCallback(async (project: Omit<Project, 'id'>) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        code: project.code,
        customer: project.customer || project.name,
        department: 'Projektledare',
        status: 'Pågår',
        project_manager: project.projectManager || '',
        sales_person: project.salesPerson || '',
        product: project.product || '',
        notes: project.notes || '',
      } as any)
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding project:', error);
      return null;
    }

    return { ...project, id: data.id } as Project;
  }, []);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.customer !== undefined) updateData.customer = updates.customer;
    if (updates.projectManager !== undefined) updateData.project_manager = updates.projectManager;
    if (updates.salesPerson !== undefined) updateData.sales_person = updates.salesPerson;
    if (updates.product !== undefined) updateData.product = updates.product;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (error) console.error('Error updating project:', error);
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) console.error('Error deleting project:', error);
  }, []);

  // Activity functions
  const addActivity = useCallback(async (projectId: string, activity: Omit<Activity, 'id'>) => {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        project_id: projectId,
        name: activity.name,
        responsible: activity.responsible,
        status: activity.status,
        start_date: activity.startDate || new Date().toISOString().split('T')[0],
        end_date: activity.endDate || new Date().toISOString().split('T')[0],
        notes: '',
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding activity:', error);
      return null;
    }

    return { ...activity, id: data.id } as Activity;
  }, []);

  const updateActivity = useCallback(async (projectId: string, activityId: string, updates: Partial<Activity>) => {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.responsible !== undefined) updateData.responsible = updates.responsible;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

    const { error } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', activityId);

    if (error) {
      console.error('Error updating activity:', error);
      throw error;
    }

    // Immediately refetch to update UI
    await loadProjects();
  }, []);

  const deleteActivity = useCallback(async (projectId: string, activityId: string) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) console.error('Error deleting activity:', error);
  }, []);

  // Forecast functions with schedule tracking
  const addForecast = useCallback(async (item: Omit<ExtendedSalesForecast, 'id'>) => {
    const { data: newForecast, error } = await supabase
      .from('forecasts')
      .insert({
        project: item.project,
        product: item.product,
        deal_status: item.dealStatus,
        notes: item.notes || null,
      })
      .select()
      .single();

    if (error || !newForecast) {
      console.error('Error adding forecast:', error);
      return null;
    }

    // Insert month amounts
    for (const [month, amount] of Object.entries(item.months)) {
      if (amount > 0) {
        await supabase.from('forecast_months').insert({
          forecast_id: newForecast.id,
          month: month,
          amount: amount,
        });
      }
    }

    return { ...item, id: newForecast.id } as ExtendedSalesForecast;
  }, []);

  const updateForecast = useCallback(async (forecastId: string, updates: Partial<ExtendedSalesForecast>) => {
    // Get current forecast to check for schedule changes
    const currentForecast = forecast.find(f => f.id === forecastId);
    
    if (updates.months && currentForecast) {
      // Check for moved months (schedule changes)
      const oldMonths = Object.entries(currentForecast.months).filter(([_, v]) => v > 0);
      const newMonths = Object.entries(updates.months).filter(([_, v]) => v > 0);

      for (const [oldMonth, oldAmount] of oldMonths) {
        const stillExists = updates.months[oldMonth] && updates.months[oldMonth] > 0;
        if (!stillExists) {
          // This month was removed or moved
          const newMonth = newMonths.find(([m, _]) => !currentForecast.months[m] || currentForecast.months[m] === 0);
          if (newMonth) {
            // Record the schedule change
            await supabase.from('schedule_history').insert({
              forecast_id: forecastId,
              original_month: oldMonth,
              new_month: newMonth[0],
              original_amount: oldAmount,
            });
          }
        }
      }

      // Delete existing month entries and insert new ones
      await supabase.from('forecast_months').delete().eq('forecast_id', forecastId);
      
      for (const [month, amount] of Object.entries(updates.months)) {
        if (amount > 0) {
          await supabase.from('forecast_months').insert({
            forecast_id: forecastId,
            month: month,
            amount: amount,
          });
        }
      }
    }

    // Update the forecast record
    const { error } = await supabase
      .from('forecasts')
      .update({
        project: updates.project,
        product: updates.product,
        deal_status: updates.dealStatus,
        notes: updates.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', forecastId);

    if (error) console.error('Error updating forecast:', error);
  }, [forecast]);

  const deleteForecast = useCallback(async (forecastId: string) => {
    const { error } = await supabase
      .from('forecasts')
      .delete()
      .eq('id', forecastId);

    if (error) console.error('Error deleting forecast:', error);
  }, []);

  // Calculate totals - EXCLUDING lost deals
  const activeForecast = forecast.filter(f => f.dealStatus !== 'Förlorad');
  
  const monthlyTotals = activeForecast.reduce((acc, item) => {
    Object.entries(item.months).forEach(([month, value]) => {
      acc[month] = (acc[month] || 0) + value;
    });
    return acc;
  }, {} as { [key: string]: number });

  const yearTotal = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0);

  const updateProjectOrder = useCallback(async (orderedProjectIds: string[]) => {
    // Optimistically update local state
    setProjects(prev => {
      const map = new Map(prev.map(p => [p.id, p]));
      return orderedProjectIds.map((id, i) => {
        const p = map.get(id);
        return p ? { ...p, sortOrder: i + 1 } : p!;
      }).filter(Boolean);
    });

    // Persist to database
    for (let i = 0; i < orderedProjectIds.length; i++) {
      await supabase
        .from('projects')
        .update({ sort_order: i + 1 } as any)
        .eq('id', orderedProjectIds[i]);
    }
  }, []);

  const updateActivityOrder = useCallback(async (projectId: string, orderedActivityIds: string[]) => {
    // Optimistically update local state
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const map = new Map(p.activities.map(a => [a.id, a]));
      const reordered = orderedActivityIds
        .map(id => map.get(id))
        .filter(Boolean) as typeof p.activities;
      // Include any activities not in the ordered list (e.g. without dates)
      const remaining = p.activities.filter(a => !orderedActivityIds.includes(a.id));
      return { ...p, activities: [...reordered, ...remaining] };
    }));

    // Persist to database
    for (let i = 0; i < orderedActivityIds.length; i++) {
      await supabase
        .from('activities')
        .update({ sort_order: i + 1 } as any)
        .eq('id', orderedActivityIds[i]);
    }
  }, []);

  return {
    projects,
    forecast,
    monthlyTotals,
    yearTotal,
    isLoading,
    isInitialized,
    addProject,
    updateProject,
    deleteProject,
    addActivity,
    updateActivity,
    deleteActivity,
    addForecast,
    updateForecast,
    deleteForecast,
    updateProjectOrder,
    updateActivityOrder,
  };
}
