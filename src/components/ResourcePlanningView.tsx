import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Users, Filter, Archive, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusLegend } from './StatusLegend';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useResourceData } from '@/hooks/useResourceData';
import { ManageInstallersDialog } from './dialogs/ManageInstallersDialog';
import { AssignInstallerDialog } from './dialogs/AssignInstallerDialog';
import { DailyEntryDialog } from './dialogs/DailyEntryDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

type ViewMode = 'weeks' | 'days';

const resourceLegend = [
  { color: 'bg-status-completed', label: 'Inom kalkyl' },
  { color: 'bg-status-in-progress', label: 'Nära överskridande' },
  { color: 'bg-status-delayed', label: 'Överskrider kalkyl' },
];

function generateWeeks(year: number) {
  const weeks: { weekNum: number; startDate: Date; label: string }[] = [];
  const jan1 = new Date(year, 0, 1);
  let current = new Date(jan1);
  while (current.getDay() !== 1) current.setDate(current.getDate() + 1);
  for (let i = 1; i <= 52; i++) {
    weeks.push({ weekNum: i, startDate: new Date(current), label: `V${i}` });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function generateDays(startDate: Date, count: number) {
  const days: { date: Date; dateStr: string; label: string; dayOfWeek: number }[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < count; i++) {
    days.push({
      date: new Date(current),
      dateStr: current.toISOString().split('T')[0],
      label: current.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
      dayOfWeek: current.getDay(),
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function ResourcePlanningView() {
  const { projects: allProjects } = useProjectDataContext();
  const {
    installers, estimations, projectInstallers, dailyEntries, isLoading,
    addInstaller, updateInstaller, deleteInstaller,
    upsertEstimation, assignInstaller, unassignInstaller,
    upsertDailyEntry,
  } = useResourceData();

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [showArchived, setShowArchived] = useState(false);
  const [filterInstaller, setFilterInstaller] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterOverloaded, setFilterOverloaded] = useState(false);
  const [filterNoResources, setFilterNoResources] = useState(false);

  // Daily entry dialog state
  const [dailyDialogOpen, setDailyDialogOpen] = useState(false);
  const [dailyDialogProject, setDailyDialogProject] = useState('');
  const [dailyDialogDate, setDailyDialogDate] = useState('');

  const weeks = useMemo(() => generateWeeks(2026), []);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayStr = today.toISOString().split('T')[0];

  const baseWeekIndex = 4;
  const visibleWeeks = 16;
  const visibleDays = 28;

  const startIndex = Math.max(0, baseWeekIndex + currentWeekOffset);
  const endIndex = Math.min(weeks.length, startIndex + visibleWeeks);
  const displayedWeeks = weeks.slice(startIndex, endIndex);

  const displayedDays = useMemo(() => {
    if (displayedWeeks.length === 0) return [];
    return generateDays(displayedWeeks[0].startDate, viewMode === 'days' ? visibleDays : visibleWeeks * 7);
  }, [viewMode, displayedWeeks]);

  const todayWeekNum = useMemo(() => {
    const startOfYear = new Date(2026, 0, 1);
    const days = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }, [today]);

  const activeProjects = allProjects.filter(p => p.status !== 'Avslutat');
  const archivedProjects = allProjects.filter(p => p.status === 'Avslutat');
  const displayProjects = showArchived ? archivedProjects : activeProjects;

  const filteredProjects = useMemo(() => {
    let result = displayProjects;
    if (filterInstaller !== 'all') {
      const projectIds = projectInstallers.filter(pi => pi.installerId === filterInstaller).map(pi => pi.projectId);
      result = result.filter(p => projectIds.includes(p.id));
    }
    if (filterCompany !== 'all') {
      const installerIds = installers.filter(i => i.company === filterCompany).map(i => i.id);
      const projectIds = projectInstallers.filter(pi => installerIds.includes(pi.installerId)).map(pi => pi.projectId);
      result = result.filter(p => projectIds.includes(p.id));
    }
    if (filterOverloaded) {
      result = result.filter(p => getResourceStatus(p.id) === 'over');
    }
    if (filterNoResources) {
      result = result.filter(p => !projectInstallers.some(pi => pi.projectId === p.id));
    }
    return result;
  }, [displayProjects, filterInstaller, filterCompany, filterOverloaded, filterNoResources, projectInstallers, installers, dailyEntries, estimations]);

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedProjects(new Set(filteredProjects.map(p => p.id)));
  const collapseAll = () => setExpandedProjects(new Set());

  const getProjectInstallers = (projectId: string) => projectInstallers.filter(pi => pi.projectId === projectId);
  const getProjectDailyEntries = (projectId: string) => dailyEntries.filter(d => d.projectId === projectId);
  const getEstimation = (projectId: string) => estimations.find(e => e.projectId === projectId);

  function getProjectSummary(projectId: string) {
    const entries = getProjectDailyEntries(projectId);
    const totalWork = entries.reduce((s, e) => s + e.plannedWorkHours, 0);
    const totalTravel = entries.reduce((s, e) => s + e.plannedTravelHours, 0);
    return { totalWork, totalTravel, total: totalWork + totalTravel };
  }

  function getResourceStatus(projectId: string): 'ok' | 'warning' | 'over' {
    const est = getEstimation(projectId);
    const totalEstimated = (est?.estimatedInstallHours || 0) + (est?.estimatedTravelHours || 0);
    if (totalEstimated === 0) return 'ok';
    const { total } = getProjectSummary(projectId);
    const ratio = total / totalEstimated;
    if (ratio > 1) return 'over';
    if (ratio > 0.85) return 'warning';
    return 'ok';
  }

  const getBarColor = (status: 'ok' | 'warning' | 'over') => {
    switch (status) {
      case 'ok': return 'bg-status-completed';
      case 'warning': return 'bg-status-in-progress';
      case 'over': return 'bg-status-delayed';
    }
  };

  const columnCount = viewMode === 'weeks' ? displayedWeeks.length : displayedDays.length;

  const yearGroups = useMemo(() => {
    const items = viewMode === 'weeks' ? displayedWeeks : displayedDays;
    const groups: { label: string; span: number }[] = [];
    items.forEach(item => {
      const d = 'startDate' in item ? item.startDate : (item as any).date;
      const y = d.getFullYear();
      const m = d.toLocaleDateString('sv-SE', { month: 'short' });
      const label = `${y} • ${m}`;
      if (groups.length > 0 && groups[groups.length - 1].label === label) groups[groups.length - 1].span++;
      else groups.push({ label, span: 1 });
    });
    return groups;
  }, [viewMode, displayedWeeks, displayedDays]);

  const todayColIndex = useMemo(() => {
    if (viewMode === 'weeks') return displayedWeeks.findIndex(w => w.weekNum === todayWeekNum);
    return displayedDays.findIndex(d => d.dateStr === todayStr);
  }, [viewMode, displayedWeeks, displayedDays, todayWeekNum, todayStr]);

  const renderTodayMarker = () => {
    if (todayColIndex < 0 || todayColIndex >= columnCount) return null;
    const leftPercent = ((todayColIndex + 0.5) / columnCount) * 100;
    return (
      <div className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20 pointer-events-none" style={{ left: `${leftPercent}%` }}>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-destructive" />
      </div>
    );
  };

  const openDailyDialog = (projectId: string, dateStr: string) => {
    const pInstallers = getProjectInstallers(projectId);
    if (pInstallers.length === 0) {
      toast.error('Koppla montörer till projektet först');
      return;
    }
    setDailyDialogProject(projectId);
    setDailyDialogDate(dateStr);
    setDailyDialogOpen(true);
  };

  // Helper: get week date range strings
  const getWeekRange = (week: { startDate: Date }) => {
    const weekStart = week.startDate;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
  };

  // Render schedule cells for a single installer in DAY view
  const renderInstallerDayCells = (projectId: string, installerId: string, status: 'ok' | 'warning' | 'over') => {
    const entries = dailyEntries.filter(d => d.projectId === projectId && d.installerId === installerId);
    const entryMap = new Map(entries.map(e => [e.date, e]));

    return displayedDays.map((day, i) => {
      const entry = entryMap.get(day.dateStr);
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      const totalH = entry ? entry.plannedWorkHours + entry.plannedTravelHours : 0;
      return (
        <div
          key={i}
          className={cn(
            'flex-1 h-7 border-r border-border/30 min-w-[28px] relative cursor-pointer hover:bg-primary/10 transition-colors',
            isWeekend && 'bg-muted/40',
          )}
          onClick={() => {
            setDailyDialogProject(projectId);
            setDailyDialogDate(day.dateStr);
            setDailyDialogOpen(true);
          }}
        >
          {entry && totalH > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute inset-0.5 flex flex-col gap-px">
                  {entry.plannedWorkHours > 0 && (
                    <div className={cn('flex-1 rounded-sm flex items-center justify-center', getBarColor(status))}>
                      <span className="text-[8px] font-bold text-white">{entry.plannedWorkHours}h</span>
                    </div>
                  )}
                  {entry.plannedTravelHours > 0 && (
                    <div className={cn('h-2 rounded-sm opacity-60 flex items-center justify-center', getBarColor(status), 'bg-stripes')}>
                      <span className="text-[7px] font-bold text-white">{entry.plannedTravelHours}h</span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{entry.installerName} – {day.dateStr}</p>
                <p>Arbete: {entry.plannedWorkHours}h</p>
                <p>Resa: {entry.plannedTravelHours}h</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    });
  };

  // Render schedule cells for a single installer in WEEK view
  const renderInstallerWeekCells = (projectId: string, installerId: string, status: 'ok' | 'warning' | 'over') => {
    const entries = dailyEntries.filter(d => d.projectId === projectId && d.installerId === installerId);

    return displayedWeeks.map(week => {
      const { start, end } = getWeekRange(week);
      const weekEntries = entries.filter(e => e.date >= start && e.date <= end);
      const workH = weekEntries.reduce((s, e) => s + e.plannedWorkHours, 0);
      const travelH = weekEntries.reduce((s, e) => s + e.plannedTravelHours, 0);
      const totalH = workH + travelH;

      return (
        <div
          key={week.weekNum}
          className={cn('flex-1 h-7 border-r border-border/30 relative', week.weekNum === todayWeekNum && 'bg-primary/5')}
        >
          {totalH > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('absolute inset-0.5 rounded-sm flex items-center justify-center', getBarColor(status))}>
                  <span className="text-[8px] font-bold text-white">
                    {workH}h{travelH > 0 ? ` +${travelH}h` : ''}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>V{week.weekNum}</p>
                <p>Arbete: {workH}h</p>
                <p>Resa: {travelH}h</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    });
  };

  // Render project-level summary cells in WEEK view (collapsed)
  const renderProjectWeekCells = (projectId: string, status: 'ok' | 'warning' | 'over') => {
    const entries = getProjectDailyEntries(projectId);
    return displayedWeeks.map(week => {
      const { start, end } = getWeekRange(week);
      const weekEntries = entries.filter(e => e.date >= start && e.date <= end);
      const workH = weekEntries.reduce((s, e) => s + e.plannedWorkHours, 0);
      const travelH = weekEntries.reduce((s, e) => s + e.plannedTravelHours, 0);
      const totalH = workH + travelH;

      return (
        <div
          key={week.weekNum}
          className={cn('flex-1 h-7 border-r border-border/30 relative', week.weekNum === todayWeekNum && 'bg-primary/5')}
        >
          {totalH > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('absolute inset-0.5 rounded-sm flex items-center justify-center', getBarColor(status))}>
                  <span className="text-[8px] font-bold text-white">{totalH}h</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>V{week.weekNum}: {totalH}h totalt</p>
                <p>Arbete: {workH}h</p>
                <p>Resa: {travelH}h</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    });
  };

  // Render project-level summary cells in DAY view (collapsed)
  const renderProjectDayCells = (projectId: string, status: 'ok' | 'warning' | 'over') => {
    const entries = getProjectDailyEntries(projectId);
    const entryByDate = new Map<string, { work: number; travel: number }>();
    entries.forEach(e => {
      const existing = entryByDate.get(e.date) || { work: 0, travel: 0 };
      entryByDate.set(e.date, { work: existing.work + e.plannedWorkHours, travel: existing.travel + e.plannedTravelHours });
    });

    return displayedDays.map((day, i) => {
      const dayData = entryByDate.get(day.dateStr);
      const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
      const totalH = dayData ? dayData.work + dayData.travel : 0;

      return (
        <div
          key={i}
          className={cn(
            'flex-1 h-7 border-r border-border/30 min-w-[28px] relative cursor-pointer hover:bg-primary/10 transition-colors',
            isWeekend && 'bg-muted/40',
          )}
          onClick={() => openDailyDialog(projectId, day.dateStr)}
        >
          {totalH > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('absolute inset-0.5 rounded-sm flex items-center justify-center', getBarColor(status))}>
                  <span className="text-[8px] font-bold text-white">{totalH}h</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{day.dateStr}</p>
                <p>Arbete: {dayData!.work}h</p>
                <p>Resa: {dayData!.travel}h</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      );
    });
  };

  const companies = useMemo(() => [...new Set(installers.map(i => i.company).filter(Boolean))], [installers]);

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Resursplanering</h1>
            <p className="text-sm text-muted-foreground">Planera montörer och resurser per projekt</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="weeks" className="text-xs px-3 h-7">Veckor</TabsTrigger>
                <TabsTrigger value="days" className="text-xs px-3 h-7">Dagar</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={expandAll}>Expandera</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={collapseAll}>Komprimera</Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setCurrentWeekOffset(Math.max(-baseWeekIndex, currentWeekOffset - (viewMode === 'days' ? 4 : 8)))}
                disabled={startIndex === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {displayedWeeks[0]?.label} – {displayedWeeks[displayedWeeks.length - 1]?.label}
              </span>
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setCurrentWeekOffset(currentWeekOffset + (viewMode === 'days' ? 4 : 8))}
                disabled={endIndex >= weeks.length}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusLegend items={resourceLegend} showTodayMarker />
          <div className="flex-1" />

          <Select value={filterInstaller} onValueChange={setFilterInstaller}>
            <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Montör" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Alla montörer</SelectItem>
              {installers.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue placeholder="Företag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Alla företag</SelectItem>
              {companies.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant={filterOverloaded ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setFilterOverloaded(!filterOverloaded)}>
            Överbelastade
          </Button>
          <Button variant={filterNoResources ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setFilterNoResources(!filterNoResources)}>
            Utan resurser
          </Button>
          <Button variant={showArchived ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-3 w-3" />Arkiverade
          </Button>

          <ManageInstallersDialog
            installers={installers}
            onAdd={addInstaller}
            onUpdate={updateInstaller}
            onDelete={deleteInstaller}
            trigger={<Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Users className="h-3 w-3" />Montörer</Button>}
          />
        </div>

        {/* Main Grid */}
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Year/Month header */}
                <div className="sticky top-0 z-10 flex border-b border-border/30 bg-card">
                  <div className="w-52 shrink-0 border-r border-border/50" />
                  <div className="flex flex-1">
                    {yearGroups.map((g, i) => (
                      <div key={i} className="border-r border-border/30 text-center text-[10px] font-semibold text-muted-foreground py-0.5" style={{ flex: g.span }}>
                        {g.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Week/Day header */}
                <div className="sticky top-[21px] z-10 flex border-b border-border/50 bg-card">
                  <div className="w-52 shrink-0 border-r border-border/50 px-2 py-1 text-xs font-semibold">
                    Projekt / Montör
                  </div>
                  <div className="flex flex-1">
                    {viewMode === 'weeks' ? displayedWeeks.map(week => (
                      <div key={week.weekNum} className={cn('flex-1 border-r border-border/30 py-0.5 text-center text-[10px] font-medium', week.weekNum === todayWeekNum && 'bg-primary/10')}>
                        <div>{week.label}</div>
                        <div className="text-muted-foreground text-[9px]">{week.startDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    )) : displayedDays.map((day, i) => (
                      <div key={i} className={cn('flex-1 border-r border-border/30 py-0.5 text-center text-[9px] font-medium min-w-[28px]', (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40', day.dateStr === todayStr && 'bg-primary/10')}>
                        <div>{['Sö', 'Må', 'Ti', 'On', 'To', 'Fr', 'Lö'][day.dayOfWeek]}</div>
                        <div className="text-muted-foreground">{day.date.getDate()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-[13rem] right-0 pointer-events-none z-20">
                    {renderTodayMarker()}
                  </div>

                  {filteredProjects.map(project => {
                    const isExpanded = expandedProjects.has(project.id);
                    const pInstallers = getProjectInstallers(project.id);
                    const resourceStatus = getResourceStatus(project.id);
                    const isArchived = project.status === 'Avslutat';

                    return (
                      <motion.div key={project.id} variants={itemVariants}>
                        {/* Project row */}
                        <div className="flex border-b border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleProject(project.id)}>
                          <div className="w-52 shrink-0 border-r border-border/50 px-2 py-1 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronUp className="h-3 w-3 text-muted-foreground rotate-180 shrink-0" />}
                              <div className={cn('h-2 w-2 rounded-full shrink-0', getBarColor(resourceStatus))} />
                              <span className="font-semibold text-xs truncate">{project.code} - {project.name}</span>
                              {!isExpanded && <span className="text-[10px] text-muted-foreground shrink-0">({pInstallers.length})</span>}
                              {(() => {
                                const est = getEstimation(project.id);
                                const summary = getProjectSummary(project.id);
                                const estTotal = (est?.estimatedInstallHours || 0) + (est?.estimatedTravelHours || 0);
                                if (estTotal === 0 && summary.total === 0) return null;
                                return (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={cn(
                                        'text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-1',
                                        resourceStatus === 'ok' && 'bg-status-completed/20 text-status-completed',
                                        resourceStatus === 'warning' && 'bg-status-in-progress/20 text-status-in-progress',
                                        resourceStatus === 'over' && 'bg-status-delayed/20 text-status-delayed',
                                      )}>
                                        {summary.total}h / {estTotal > 0 ? `${estTotal}h` : '–'}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      <p className="font-semibold mb-1">Kalkyl vs Utfall</p>
                                      <p>Montage: {summary.totalWork}h / {est?.estimatedInstallHours || 0}h kalkyl</p>
                                      <p>Resa: {summary.totalTravel}h / {est?.estimatedTravelHours || 0}h kalkyl</p>
                                      <p className="mt-1 font-medium">Totalt: {summary.total}h / {estTotal}h</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })()}
                            </div>
                            {!isArchived && (
                              <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                <AssignInstallerDialog
                                  projectName={project.name}
                                  installers={installers}
                                  projectInstallers={pInstallers}
                                  onAssign={(installerId) => assignInstaller(project.id, installerId)}
                                  onUnassign={unassignInstaller}
                                  trigger={<Button size="icon" variant="ghost" className="h-5 w-5"><UserPlus className="h-3 w-3" /></Button>}
                                />
                              </div>
                            )}
                          </div>
                          {/* Schedule cells – collapsed: project-level totals */}
                          <div className="flex flex-1 items-center relative">
                            {!isExpanded && viewMode === 'weeks' && renderProjectWeekCells(project.id, resourceStatus)}
                            {!isExpanded && viewMode === 'days' && renderProjectDayCells(project.id, resourceStatus)}
                            {isExpanded && viewMode === 'weeks' && displayedWeeks.map(w => (
                              <div key={w.weekNum} className={cn('flex-1 h-7 border-r border-border/30', w.weekNum === todayWeekNum && 'bg-primary/5')} />
                            ))}
                            {isExpanded && viewMode === 'days' && displayedDays.map((day, i) => (
                              <div key={i} className={cn('flex-1 h-7 border-r border-border/30 min-w-[28px]', (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40')} />
                            ))}
                          </div>
                        </div>

                        {/* Expanded: installer rows only */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                              {pInstallers.map(pi => (
                                <div key={pi.id} className="flex border-b border-border/30 hover:bg-muted/20 group">
                                  <div className="w-52 shrink-0 border-r border-border/50 px-2 py-0.5 pl-7 flex items-center min-w-0">
                                    <div className="min-w-0 flex items-center gap-1.5">
                                      <div className={cn('h-2 w-2 rounded-full shrink-0', getBarColor(resourceStatus))} />
                                      <span className="text-xs truncate">{pi.installerName || 'Okänd'}</span>
                                      <span className="text-[9px] text-muted-foreground">({pi.installerCompany})</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-1 items-center relative">
                                    {viewMode === 'days'
                                      ? renderInstallerDayCells(project.id, pi.installerId, resourceStatus)
                                      : renderInstallerWeekCells(project.id, pi.installerId, resourceStatus)
                                    }
                                  </div>
                                </div>
                              ))}

                              {pInstallers.length === 0 && (
                                <div className="flex border-b border-border/30">
                                  <div className="w-52 shrink-0 border-r border-border/50 px-2 py-2 pl-7">
                                    <span className="text-[10px] text-muted-foreground italic">Inga montörer kopplade</span>
                                  </div>
                                  <div className="flex-1" />
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}

                  {filteredProjects.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      {showArchived ? 'Inga arkiverade projekt.' : 'Inga aktiva projekt matchar filtren.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Entry Dialog */}
        <DailyEntryDialog
          open={dailyDialogOpen}
          onOpenChange={setDailyDialogOpen}
          projectId={dailyDialogProject}
          date={dailyDialogDate}
          projectInstallers={getProjectInstallers(dailyDialogProject)}
          existingEntries={getProjectDailyEntries(dailyDialogProject)}
          onSave={async (installerId, workHours, travelHours) => {
            await upsertDailyEntry(dailyDialogProject, installerId, dailyDialogDate, workHours, travelHours);
            toast.success('Dagpost sparad');
          }}
        />
      </motion.div>
    </TooltipProvider>
  );
}
