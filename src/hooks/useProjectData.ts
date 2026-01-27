import { useState, useCallback } from 'react';
import { 
  projects as initialProjects, 
  salesForecast as initialForecast,
  Project, 
  Activity, 
  SalesForecast,
  Status,
  Department
} from '@/data/projectData';

export type DealStatus = 'Tagen' | 'Flyttad' | 'Förlorad' | 'Prognos';

export interface ExtendedSalesForecast extends SalesForecast {
  id: string;
  dealStatus: DealStatus;
}

export function useProjectData() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [forecast, setForecast] = useState<ExtendedSalesForecast[]>(
    initialForecast.map((item, index) => ({
      ...item,
      id: `forecast-${index}`,
      dealStatus: 'Prognos' as DealStatus,
    }))
  );

  // Project functions
  const addProject = useCallback((project: Omit<Project, 'id'>) => {
    const newProject: Project = {
      ...project,
      id: `project-${Date.now()}`,
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    ));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  }, []);

  // Activity functions
  const addActivity = useCallback((projectId: string, activity: Omit<Activity, 'id'>) => {
    const newActivity: Activity = {
      ...activity,
      id: `${projectId}-${Date.now()}`,
    };
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, activities: [...p.activities, newActivity] }
        : p
    ));
    return newActivity;
  }, []);

  const updateActivity = useCallback((projectId: string, activityId: string, updates: Partial<Activity>) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { 
            ...p, 
            activities: p.activities.map(a => 
              a.id === activityId ? { ...a, ...updates } : a
            )
          }
        : p
    ));
  }, []);

  const deleteActivity = useCallback((projectId: string, activityId: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, activities: p.activities.filter(a => a.id !== activityId) }
        : p
    ));
  }, []);

  // Forecast functions
  const addForecast = useCallback((item: Omit<ExtendedSalesForecast, 'id'>) => {
    const newForecast: ExtendedSalesForecast = {
      ...item,
      id: `forecast-${Date.now()}`,
    };
    setForecast(prev => [...prev, newForecast]);
    return newForecast;
  }, []);

  const updateForecast = useCallback((forecastId: string, updates: Partial<ExtendedSalesForecast>) => {
    setForecast(prev => prev.map(f => 
      f.id === forecastId ? { ...f, ...updates } : f
    ));
  }, []);

  const deleteForecast = useCallback((forecastId: string) => {
    setForecast(prev => prev.filter(f => f.id !== forecastId));
  }, []);

  // Calculate totals
  const monthlyTotals = forecast.reduce((acc, item) => {
    Object.entries(item.months).forEach(([month, value]) => {
      acc[month] = (acc[month] || 0) + value;
    });
    return acc;
  }, {} as { [key: string]: number });

  const yearTotal = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0);

  return {
    projects,
    forecast,
    monthlyTotals,
    yearTotal,
    addProject,
    updateProject,
    deleteProject,
    addActivity,
    updateActivity,
    deleteActivity,
    addForecast,
    updateForecast,
    deleteForecast,
  };
}
