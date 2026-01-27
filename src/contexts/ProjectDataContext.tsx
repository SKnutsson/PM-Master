import { createContext, useContext, ReactNode } from 'react';
import { useProjectData, ExtendedSalesForecast, DealStatus } from '@/hooks/useProjectData';
import { Project, Activity, Status, Department } from '@/data/projectData';

interface ProjectDataContextType {
  projects: Project[];
  forecast: ExtendedSalesForecast[];
  monthlyTotals: { [key: string]: number };
  yearTotal: number;
  addProject: (project: Omit<Project, 'id'>) => Project;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  addActivity: (projectId: string, activity: Omit<Activity, 'id'>) => Activity;
  updateActivity: (projectId: string, activityId: string, updates: Partial<Activity>) => void;
  deleteActivity: (projectId: string, activityId: string) => void;
  addForecast: (item: Omit<ExtendedSalesForecast, 'id'>) => ExtendedSalesForecast;
  updateForecast: (forecastId: string, updates: Partial<ExtendedSalesForecast>) => void;
  deleteForecast: (forecastId: string) => void;
}

const ProjectDataContext = createContext<ProjectDataContextType | null>(null);

export function ProjectDataProvider({ children }: { children: ReactNode }) {
  const data = useProjectData();

  return (
    <ProjectDataContext.Provider value={data}>
      {children}
    </ProjectDataContext.Provider>
  );
}

export function useProjectDataContext() {
  const context = useContext(ProjectDataContext);
  if (!context) {
    throw new Error('useProjectDataContext must be used within ProjectDataProvider');
  }
  return context;
}

export type { ExtendedSalesForecast, DealStatus };
