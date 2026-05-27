import { useState, useEffect } from 'react';
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
import { ServicesView } from './ServicesView';
import { AtaView } from './AtaView';
import { CrmDashboard } from './crm/CrmDashboard';
import { CrmQuotesView } from './crm/CrmQuotesView';
import { CrmCustomersView } from './crm/CrmCustomersView';
import { CrmStatsView } from './crm/CrmStatsView';
import { ProjectDataProvider } from '@/contexts/ProjectDataContext';
import { useAppMode } from '@/contexts/AppModeContext';

export function MainLayout() {
  const { mode } = useAppMode();
  const [currentView, setCurrentView] = useState<View>(mode === 'crm' ? 'crm-dashboard' : 'dashboard');

  // When mode changes, jump to that mode's dashboard
  useEffect(() => {
    setCurrentView(mode === 'crm' ? 'crm-dashboard' : 'dashboard');
  }, [mode]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <ProjectsView />;
      case 'forecast': return <ForecastView />;
      case 'timeline': return <TimelineView />;
      case 'resources': return <ResourcePlanningView />;
      case 'resources-analytics': return <ResourceAnalyticsView />;
      case 'documentation': return <DocumentationPlanView />;
      case 'my-tasks': return <MyTasksView />;
      case 'profile': return <ProfileView />;
      case 'services': return <ServicesView />;
      case 'ata': return <AtaView />;
      case 'crm-dashboard': return <CrmDashboard />;
      case 'crm-quotes': return <CrmQuotesView />;
      case 'crm-customers': return <CrmCustomersView />;
      case 'crm-stats': return <CrmStatsView />;
      default: return <Dashboard />;
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
