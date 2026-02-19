import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useResourceData } from '@/hooks/useResourceData';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Clock, TrendingUp, TrendingDown, Minus, Wrench, Car } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: 'default' | 'green' | 'red' | 'yellow';
}

function StatCard({ title, value, sub, icon, accent = 'default' }: StatCardProps) {
  const accentClass = {
    default: 'border-border/50',
    green: 'border-emerald-500/50 bg-emerald-500/5',
    red: 'border-red-500/50 bg-red-500/5',
    yellow: 'border-yellow-500/50 bg-yellow-500/5',
  }[accent];

  const valueClass = {
    default: 'text-foreground',
    green: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  }[accent];

  return (
    <motion.div variants={cardVariants}>
      <Card className={cn('border bg-card/80', accentClass)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{title}</p>
              <p className={cn('text-2xl font-bold tabular-nums', valueClass)}>{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
            <div className={cn('shrink-0 rounded-md p-2 bg-muted/50', accent === 'green' && 'bg-emerald-500/10', accent === 'red' && 'bg-red-500/10', accent === 'yellow' && 'bg-yellow-500/10')}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg text-xs">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}h</span>
        </div>
      ))}
    </div>
  );
};

export function ResourceAnalyticsView() {
  const { projects: allProjects } = useProjectDataContext();
  const { estimations, dailyEntries, isLoading } = useResourceData();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const sortedProjects = useMemo(() =>
    [...allProjects].sort((a, b) => (a.code || '').localeCompare(b.code || '')),
    [allProjects]
  );

  const selectedProject = useMemo(() =>
    sortedProjects.find(p => p.id === selectedProjectId) ?? null,
    [sortedProjects, selectedProjectId]
  );

  const estimation = useMemo(() =>
    estimations.find(e => e.projectId === selectedProjectId) ?? null,
    [estimations, selectedProjectId]
  );

  const projectEntries = useMemo(() =>
    dailyEntries.filter(e => e.projectId === selectedProjectId),
    [dailyEntries, selectedProjectId]
  );

  const actualWork = useMemo(() =>
    projectEntries.reduce((s, e) => s + e.plannedWorkHours, 0),
    [projectEntries]
  );

  const actualTravel = useMemo(() =>
    projectEntries.reduce((s, e) => s + e.plannedTravelHours, 0),
    [projectEntries]
  );

  const estimatedWork = estimation?.estimatedInstallHours ?? 0;
  const estimatedTravel = estimation?.estimatedTravelHours ?? 0;

  const workDeviation = actualWork - estimatedWork;
  const travelDeviation = actualTravel - estimatedTravel;
  const totalDeviation = (actualWork + actualTravel) - (estimatedWork + estimatedTravel);

  const deviationAccent = (dev: number, hasEst: boolean): 'green' | 'red' | 'yellow' | 'default' => {
    if (!hasEst) return 'default';
    if (dev === 0) return 'green';
    if (dev > 0) return 'red';
    return 'green';
  };

  const formatDeviation = (dev: number) => {
    if (dev === 0) return '±0h';
    return dev > 0 ? `+${dev}h` : `${dev}h`;
  };

  const chartData = [
    {
      name: 'Montage',
      'Kalkyl': estimatedWork,
      'Utfall': actualWork,
    },
    {
      name: 'Resa',
      'Kalkyl': estimatedTravel,
      'Utfall': actualTravel,
    },
    {
      name: 'Totalt',
      'Kalkyl': estimatedWork + estimatedTravel,
      'Utfall': actualWork + actualTravel,
    },
  ];

  const hasEstimation = estimatedWork > 0 || estimatedTravel > 0;
  const hasData = actualWork > 0 || actualTravel > 0 || hasEstimation;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 p-4"
    >
      {/* Header + Project selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Resursanalys</h2>
          <p className="text-sm text-muted-foreground">Jämför kalkyl mot utfall per projekt</p>
        </div>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[280px] h-9">
            <SelectValue placeholder="Välj ett projekt…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {sortedProjects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.code ? `${p.code} – ` : ''}{p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProjectId && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <TrendingUp className="h-10 w-10 opacity-20" />
          <p className="text-sm">Välj ett projekt för att se statistik</p>
        </div>
      )}

      {selectedProjectId && !hasData && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-2">
          <Clock className="h-10 w-10 opacity-20" />
          <p className="text-sm">Inga data för det valda projektet</p>
          <p className="text-xs">Lägg till en kalkyl och dagsnoteringar för att se statistik</p>
        </div>
      )}

      {selectedProjectId && (hasData || isLoading) && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatCard
              title="Kalkyl – montage"
              value={`${estimatedWork}h`}
              icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Kalkyl – resa"
              value={`${estimatedTravel}h`}
              icon={<Car className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Utfall – montage"
              value={`${actualWork}h`}
              accent={hasEstimation ? (actualWork > estimatedWork ? 'red' : 'green') : 'default'}
              icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Utfall – resa"
              value={`${actualTravel}h`}
              accent={hasEstimation ? (actualTravel > estimatedTravel ? 'red' : 'green') : 'default'}
              icon={<Car className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Total avvikelse"
              value={formatDeviation(totalDeviation)}
              sub={hasEstimation ? `Kalkyl: ${estimatedWork + estimatedTravel}h · Utfall: ${actualWork + actualTravel}h` : 'Ingen kalkyl angiven'}
              accent={deviationAccent(totalDeviation, hasEstimation)}
              icon={
                totalDeviation === 0 ? <Minus className="h-4 w-4 text-muted-foreground" /> :
                totalDeviation > 0 ? <TrendingUp className="h-4 w-4 text-red-400" /> :
                <TrendingDown className="h-4 w-4 text-emerald-400" />
              }
            />
          </div>

          {/* Deviation detail */}
          {hasEstimation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className={cn('border', workDeviation > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-xs">
                    <span className="text-muted-foreground">Montage avvikelse: </span>
                    <span className={cn('font-semibold', workDeviation > 0 ? 'text-red-400' : 'text-emerald-400')}>
                      {formatDeviation(workDeviation)}
                    </span>
                    <span className="text-muted-foreground ml-1">({actualWork}h av {estimatedWork}h)</span>
                  </div>
                </CardContent>
              </Card>
              <Card className={cn('border', travelDeviation > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-xs">
                    <span className="text-muted-foreground">Resa avvikelse: </span>
                    <span className={cn('font-semibold', travelDeviation > 0 ? 'text-red-400' : 'text-emerald-400')}>
                      {formatDeviation(travelDeviation)}
                    </span>
                    <span className="text-muted-foreground ml-1">({actualTravel}h av {estimatedTravel}h)</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bar chart */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Kalkyl vs Utfall (timmar)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    unit="h"
                    width={36}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12, color: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar
                    dataKey="Kalkyl"
                    fill="hsl(var(--muted-foreground))"
                    radius={[3, 3, 0, 0]}
                    opacity={0.6}
                    maxBarSize={64}
                  />
                  <Bar
                    dataKey="Utfall"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={64}
                    fill="hsl(142 71% 45%)"
                  />
                </BarChart>
              </ResponsiveContainer>

              {hasEstimation && (
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground border-t border-border/30 pt-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    Inom kalkyl = grönt utfall
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    Överskridning driver avvikelse
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
