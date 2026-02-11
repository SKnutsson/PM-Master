import { createContext, useContext, ReactNode } from 'react';
import { useDatabaseData, ExtendedSalesForecast, DealStatus, ScheduleChange } from '@/hooks/useDatabaseData';
import { Project, Activity, Status, Department } from '@/data/projectData';

interface RollingMonth {
  month: string;
  year: number;
  label: string;
  total: number;
}

interface ProjectDataContextType {
  projects: Project[];
  forecast: ExtendedSalesForecast[];
  monthlyTotals: { [key: string]: number };
  yearTotal: number;
  monthlyTotals2026: { [key: string]: number };
  yearTotal2026: number;
  monthlyTotals2027: { [key: string]: number };
  yearTotal2027: number;
  rollingMonthlyTotals: RollingMonth[];
  rollingTotal: number;
  isLoading: boolean;
  isInitialized: boolean;
  addProject: (project: Omit<Project, 'id'>) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addActivity: (projectId: string, activity: Omit<Activity, 'id'>) => Promise<Activity | null>;
  updateActivity: (projectId: string, activityId: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (projectId: string, activityId: string) => Promise<void>;
  addForecast: (item: Omit<ExtendedSalesForecast, 'id'>) => Promise<ExtendedSalesForecast | null>;
  updateForecast: (forecastId: string, updates: Partial<ExtendedSalesForecast>) => Promise<void>;
  deleteForecast: (forecastId: string) => Promise<void>;
}

const ProjectDataContext = createContext<ProjectDataContextType | null>(null);

export function ProjectDataProvider({ children }: { children: ReactNode }) {
  const data = useDatabaseData();

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

export type { ExtendedSalesForecast, DealStatus, ScheduleChange, RollingMonth };
