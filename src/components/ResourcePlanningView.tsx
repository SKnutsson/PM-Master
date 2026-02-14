import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Users, Filter, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusLegend } from './StatusLegend';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useResourceData, ResourceAllocation } from '@/hooks/useResourceData';
import { ManageInstallersDialog } from './dialogs/ManageInstallersDialog';
import { AddAllocationDialog } from './dialogs/AddAllocationDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  const days: { date: Date; label: string; dayOfWeek: number }[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < count; i++) {
    days.push({ date: new Date(current), label: current.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }), dayOfWeek: current.getDay() });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function ResourcePlanningView() {
  const { projects: allProjects } = useProjectDataContext();
  const {
    installers, estimations, allocations, isLoading,
    addInstaller, updateInstaller, deleteInstaller,
    upsertEstimation, addAllocation, deleteAllocation,
  } = useResourceData();

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('weeks');
  const [showArchived, setShowArchived] = useState(false);
  const [filterInstaller, setFilterInstaller] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterOverloaded, setFilterOverloaded] = useState(false);
  const [filterNoResources, setFilterNoResources] = useState(false);

  // Inline estimation editing
  const [editingEstimation, setEditingEstimation] = useState<string | null>(null);
  const [estForm, setEstForm] = useState({ install: '', travel: '' });

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
    if (viewMode !== 'days' || displayedWeeks.length === 0) return [];
    return generateDays(displayedWeeks[0].startDate, visibleDays);
  }, [viewMode, displayedWeeks]);

  const todayWeekNum = useMemo(() => {
    const startOfYear = new Date(2026, 0, 1);
    const days = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }, [today]);

  const activeProjects = allProjects.filter(p => p.status !== 'Avslutat');
  const archivedProjects = allProjects.filter(p => p.status === 'Avslutat');

  const displayProjects = showArchived ? archivedProjects : activeProjects;

  // Apply filters
  const filteredProjects = useMemo(() => {
    let result = displayProjects;
    if (filterInstaller !== 'all') {
      const projectIds = allocations.filter(a => a.installerId === filterInstaller).map(a => a.projectId);
      result = result.filter(p => projectIds.includes(p.id));
    }
    if (filterCompany !== 'all') {
      const installerIds = installers.filter(i => i.company === filterCompany).map(i => i.id);
      const projectIds = allocations.filter(a => installerIds.includes(a.installerId)).map(a => a.projectId);
      result = result.filter(p => projectIds.includes(p.id));
    }
    if (filterOverloaded) {
      result = result.filter(p => {
        const est = estimations.find(e => e.projectId === p.id);
        const totalPlanned = allocations.filter(a => a.projectId === p.id).reduce((s, a) => s + a.plannedHours, 0);
        const totalEstimated = (est?.estimatedInstallHours || 0) + (est?.estimatedTravelHours || 0);
        return totalEstimated > 0 && totalPlanned > totalEstimated;
      });
    }
    if (filterNoResources) {
      result = result.filter(p => !allocations.some(a => a.projectId === p.id));
    }
    return result;
  }, [displayProjects, filterInstaller, filterCompany, filterOverloaded, filterNoResources, allocations, estimations, installers]);

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedProjects(new Set(filteredProjects.map(p => p.id)));
  const collapseAll = () => setExpandedProjects(new Set());

  const getProjectAllocations = (projectId: string) => allocations.filter(a => a.projectId === projectId);
  const getEstimation = (projectId: string) => estimations.find(e => e.projectId === projectId);

  const getResourceStatus = (projectId: string): 'ok' | 'warning' | 'over' => {
    const est = getEstimation(projectId);
    const totalEstimated = (est?.estimatedInstallHours || 0) + (est?.estimatedTravelHours || 0);
    if (totalEstimated === 0) return 'ok';
    const totalPlanned = getProjectAllocations(projectId).reduce((s, a) => s + a.plannedHours, 0);
    const ratio = totalPlanned / totalEstimated;
    if (ratio > 1) return 'over';
    if (ratio > 0.85) return 'warning';
    return 'ok';
  };

  const getBarColor = (status: 'ok' | 'warning' | 'over') => {
    switch (status) {
      case 'ok': return 'bg-status-completed';
      case 'warning': return 'bg-status-in-progress';
      case 'over': return 'bg-status-delayed';
    }
  };

  const columnCount = viewMode === 'weeks' ? displayedWeeks.length : displayedDays.length;

  // Year/Month header groups
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
    return displayedDays.findIndex(d => d.date.toISOString().split('T')[0] === todayStr);
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

  const renderAllocationBar = (alloc: ResourceAllocation, projectStatus: 'ok' | 'warning' | 'over') => {
    let startCol: number, endCol: number;
    if (viewMode === 'weeks') {
      startCol = displayedWeeks.findIndex(w => w.weekNum === getWeekNumber(alloc.startDate));
      endCol = displayedWeeks.findIndex(w => w.weekNum === getWeekNumber(alloc.endDate));
    } else {
      startCol = displayedDays.findIndex(d => d.date.toISOString().split('T')[0] === alloc.startDate);
      endCol = displayedDays.findIndex(d => d.date.toISOString().split('T')[0] === alloc.endDate);
    }
    if (startCol < 0 && endCol < 0) return null;
    startCol = Math.max(0, startCol);
    endCol = Math.max(startCol, endCol < 0 ? columnCount - 1 : endCol);

    const leftPct = (startCol / columnCount) * 100;
    const widthPct = ((endCol - startCol + 1) / columnCount) * 100;

    return (
      <Tooltip key={alloc.id}>
        <TooltipTrigger asChild>
          <div
            className={cn('absolute top-0.5 bottom-0.5 rounded-sm', getBarColor(projectStatus))}
            style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.max(0.5, widthPct)}%` }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-semibold">{alloc.installerName}</p>
          <p className="text-muted-foreground">{alloc.startDate} → {alloc.endDate}</p>
          <p className="text-muted-foreground">{alloc.plannedHours}h planerat</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderBackgroundCells = () => {
    if (viewMode === 'weeks') {
      return displayedWeeks.map(week => (
        <div key={week.weekNum} className={cn('flex-1 h-6 border-r border-border/30', week.weekNum === todayWeekNum && 'bg-primary/5')} />
      ));
    }
    return displayedDays.map((day, i) => (
      <div key={i} className={cn('flex-1 h-6 border-r border-border/30 min-w-[28px]', (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40')} />
    ));
  };

  const startEditEstimation = (projectId: string) => {
    const est = getEstimation(projectId);
    setEditingEstimation(projectId);
    setEstForm({
      install: String(est?.estimatedInstallHours || 0),
      travel: String(est?.estimatedTravelHours || 0),
    });
  };

  const saveEstimation = async (projectId: string) => {
    await upsertEstimation(projectId, parseFloat(estForm.install) || 0, parseFloat(estForm.travel) || 0);
    setEditingEstimation(null);
    toast.success('Kalkylerad tid sparad');
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
              <div className="min-w-[1000px]">
                {/* Year/Month header */}
                <div className="sticky top-0 z-10 flex border-b border-border/30 bg-card">
                  <div className="w-60 shrink-0 border-r border-border/50" />
                  <div className="w-28 shrink-0 border-r border-border/50" />
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
                  <div className="w-60 shrink-0 border-r border-border/50 px-2 py-1 text-xs font-semibold">
                    Projekt / Montage
                  </div>
                  <div className="w-28 shrink-0 border-r border-border/50 px-1 py-1 text-[10px] font-semibold text-muted-foreground">
                    Kalkyl / Planerat
                  </div>
                  <div className="flex flex-1">
                    {viewMode === 'weeks' ? displayedWeeks.map(week => (
                      <div key={week.weekNum} className={cn('flex-1 border-r border-border/30 py-0.5 text-center text-[10px] font-medium', week.weekNum === todayWeekNum && 'bg-primary/10')}>
                        <div>{week.label}</div>
                        <div className="text-muted-foreground text-[9px]">{week.startDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    )) : displayedDays.map((day, i) => (
                      <div key={i} className={cn('flex-1 border-r border-border/30 py-0.5 text-center text-[9px] font-medium min-w-[28px]', (day.dayOfWeek === 0 || day.dayOfWeek === 6) && 'bg-muted/40', day.date.toISOString().split('T')[0] === todayStr && 'bg-primary/10')}>
                        <div>{['Sö', 'Må', 'Ti', 'On', 'To', 'Fr', 'Lö'][day.dayOfWeek]}</div>
                        <div className="text-muted-foreground">{day.date.getDate()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-[22rem] right-0 pointer-events-none z-20">
                    {renderTodayMarker()}
                  </div>

                  {filteredProjects.map(project => {
                    const isExpanded = expandedProjects.has(project.id);
                    const projectAllocations = getProjectAllocations(project.id);
                    const est = getEstimation(project.id);
                    const totalEstimated = (est?.estimatedInstallHours || 0) + (est?.estimatedTravelHours || 0);
                    const totalPlanned = projectAllocations.reduce((s, a) => s + a.plannedHours, 0);
                    const resourceStatus = getResourceStatus(project.id);
                    const isArchived = project.status === 'Avslutat';

                    return (
                      <motion.div key={project.id} variants={itemVariants}>
                        {/* Project row */}
                        <div className="flex border-b border-border/50 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleProject(project.id)}>
                          <div className="w-60 shrink-0 border-r border-border/50 px-2 py-1 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronUp className="h-3 w-3 text-muted-foreground rotate-180 shrink-0" />}
                              <div className={cn('h-2 w-2 rounded-full shrink-0', getBarColor(resourceStatus))} />
                              <span className="font-semibold text-xs truncate">{project.code} - {project.name}</span>
                              {!isExpanded && <span className="text-[10px] text-muted-foreground shrink-0">({projectAllocations.length})</span>}
                            </div>
                            {!isArchived && (
                              <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                <AddAllocationDialog
                                  projectId={project.id}
                                  installers={installers}
                                  onAdd={addAllocation}
                                  trigger={<Button size="icon" variant="ghost" className="h-5 w-5"><Plus className="h-3 w-3" /></Button>}
                                />
                              </div>
                            )}
                          </div>
                          <div className="w-28 shrink-0 border-r border-border/50 px-1 py-1 flex items-center">
                            <span className={cn('text-[10px]', resourceStatus === 'over' ? 'text-destructive font-semibold' : resourceStatus === 'warning' ? 'text-status-in-progress font-medium' : 'text-muted-foreground')}>
                              {totalPlanned}h / {totalEstimated}h
                            </span>
                          </div>
                          {/* Summary bar when collapsed */}
                          {!isExpanded && (
                            <div className="flex flex-1 items-center relative">
                              {renderBackgroundCells()}
                              {projectAllocations.map(alloc => renderAllocationBar(alloc, resourceStatus))}
                            </div>
                          )}
                          {isExpanded && <div className="flex-1" />}
                        </div>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                              {/* Estimation row */}
                              <div className="flex border-b border-border/30 bg-muted/10">
                                <div className="w-60 shrink-0 border-r border-border/50 px-2 py-1 pl-7">
                                  {editingEstimation === project.id ? (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                      <span className="text-[10px] text-muted-foreground">Montage:</span>
                                      <Input type="number" value={estForm.install} onChange={e => setEstForm(f => ({ ...f, install: e.target.value }))} className="h-5 w-14 text-[10px] px-1" />
                                      <span className="text-[10px] text-muted-foreground">Resa:</span>
                                      <Input type="number" value={estForm.travel} onChange={e => setEstForm(f => ({ ...f, travel: e.target.value }))} className="h-5 w-14 text-[10px] px-1" />
                                      <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => saveEstimation(project.id)}>✓</Button>
                                      <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1" onClick={() => setEditingEstimation(null)}>✕</Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (!isArchived) startEditEstimation(project.id); }}>
                                      <span className="text-[10px] text-muted-foreground">
                                        Kalkyl: Montage {est?.estimatedInstallHours || 0}h • Resa {est?.estimatedTravelHours || 0}h • Total {totalEstimated}h
                                      </span>
                                      {!isArchived && <span className="text-[10px] text-primary">✏️</span>}
                                    </div>
                                  )}
                                </div>
                                <div className="w-28 shrink-0 border-r border-border/50" />
                                <div className="flex-1" />
                              </div>

                              {/* Allocation rows */}
                              {projectAllocations.map(alloc => (
                                <div key={alloc.id} className="flex border-b border-border/30 hover:bg-muted/20 group">
                                  <div className="w-60 shrink-0 border-r border-border/50 px-2 py-0.5 pl-7 flex items-center justify-between min-w-0">
                                    <div className="min-w-0 flex items-center gap-1.5">
                                      <div className={cn('h-2 w-2 rounded-full shrink-0', getBarColor(resourceStatus))} />
                                      <span className="text-xs truncate">{alloc.installerName || 'Okänd'}</span>
                                      <span className="text-[9px] text-muted-foreground">({alloc.installerCompany})</span>
                                    </div>
                                    {!isArchived && (
                                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive"
                                        onClick={() => deleteAllocation(alloc.id)}>
                                        <span className="text-[10px]">✕</span>
                                      </Button>
                                    )}
                                  </div>
                                  <div className="w-28 shrink-0 border-r border-border/50 px-1 py-0.5 flex items-center">
                                    <span className="text-[9px] text-muted-foreground">{alloc.plannedHours}h • {alloc.startDate} → {alloc.endDate}</span>
                                  </div>
                                  <div className="flex flex-1 items-center relative">
                                    {renderBackgroundCells()}
                                    {renderAllocationBar(alloc, resourceStatus)}
                                  </div>
                                </div>
                              ))}

                              {projectAllocations.length === 0 && (
                                <div className="flex border-b border-border/30">
                                  <div className="w-60 shrink-0 border-r border-border/50 px-2 py-2 pl-7">
                                    <span className="text-[10px] text-muted-foreground italic">Inga montageperioder tillagda</span>
                                  </div>
                                  <div className="w-28 shrink-0 border-r border-border/50" />
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
      </motion.div>
    </TooltipProvider>
  );
}
