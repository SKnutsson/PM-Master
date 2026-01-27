import { useState } from 'react';
import { Sidebar, View } from './Sidebar';
import { Dashboard } from './Dashboard';
import { ProjectsView } from './ProjectsView';
import { ForecastView } from './ForecastView';
import { TimelineView } from './TimelineView';

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>
    </div>
  );
}
