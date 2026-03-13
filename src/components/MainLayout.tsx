import { useState } from 'react';
import { Sidebar, View } from './Sidebar';
import { Dashboard } from './Dashboard';
import { ProjectsView } from './ProjectsView';
import { ForecastView } from './ForecastView';
import { TimelineView } from './TimelineView';
import { ResourcePlanningView } from './ResourcePlanningView';
import { ResourceAnalyticsView } from './ResourceAnalyticsView';
import { DocumentationPlanView } from './DocumentationPlanView';
import { ProfileView } from './ProfileView';
import { MyTasksView } from './MyTasksView';
import { AboutView } from './AboutView';
import { ProjectDataProvider } from '@/contexts/ProjectDataContext';

export function MainLayout() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <ProjectsView />;
      case 'forecast':
        return <ForecastView />;
      case 'timeline':
        return <TimelineView />;
      case 'resources':
        return <ResourcePlanningView />;
      case 'resources-analytics':
        return <ResourceAnalyticsView />;
      case 'documentation':
        return <DocumentationPlanView />;
      case 'my-tasks':
        return <MyTasksView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProjectDataProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 overflow-auto overflow-x-auto">
          {renderView()}
        </main>
      </div>
    </ProjectDataProvider>
  );
}
