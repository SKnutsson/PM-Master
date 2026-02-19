import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { useResourceData } from '@/hooks/useResourceData';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
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
  icon: React.ReactNode;
  accent?: 'default' | 'green' | 'red';
}

function StatCard({ title, value, icon, accent = 'default' }: StatCardProps) {
  const borderClass = {
    default: 'border-border/50',
    green: 'border-emerald-500/50 bg-emerald-500/5',
    red: 'border-red-500/50 bg-red-500/5',
  }[accent];

  const valueClass = {
    default: 'text-foreground',
    green: 'text-emerald-400',
    red: 'text-red-400',
  }[accent];

  return (
    <motion.div variants={cardVariants}>
      <Card className={cn('border bg-card/80', borderClass)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{title}</p>
              <p className={cn('text-2xl font-bold tabular-nums', valueClass)}>{value}</p>
            </div>
            <div className={cn(
              'shrink-0 rounded-md p-2 bg-muted/50',
              accent === 'green' && 'bg-emerald-500/10',
              accent === 'red' && 'bg-red-500/10',
            )}>
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

  const hasEstimation = estimatedWork > 0 || estimatedTravel > 0;
  const hasData = actualWork > 0 || actualTravel > 0 || hasEstimation;

  const formatDeviation = (dev: number) => {
    if (dev === 0) return '±0h';
    return dev > 0 ? `+${dev}h` : `${dev}h`;
  };

  // Chart: only Montage and Resa (no Totalt)
  const chartData = [
    { name: 'Montage', 'Kalkyl': estimatedWork, 'Utfall': actualWork },
    { name: 'Resa', 'Kalkyl': estimatedTravel, 'Utfall': actualTravel },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 p-6"
    >
      {/* Header + Project selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resursanalys</h1>
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
          {/* Paired stat cards: Montage pair | Resa pair | Total */}
          <div className="flex flex-wrap gap-3">
            {/* Montage pair */}
            <div className="flex gap-3 flex-1 min-w-[300px]">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 pl-0.5">Montage</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    title="Kalkyl"
                    value={`${estimatedWork}h`}
                    icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
                  />
                  <StatCard
                    title="Utfall"
                    value={`${actualWork}h`}
                    accent={hasEstimation ? (actualWork > estimatedWork ? 'red' : 'green') : 'default'}
                    icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              </div>
            </div>

            {/* Resa pair */}
            <div className="flex gap-3 flex-1 min-w-[300px]">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 pl-0.5">Resa</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    title="Kalkyl"
                    value={`${estimatedTravel}h`}
                    icon={<Car className="h-4 w-4 text-muted-foreground" />}
                  />
                  <StatCard
                    title="Utfall"
                    value={`${actualTravel}h`}
                    accent={hasEstimation ? (actualTravel > estimatedTravel ? 'red' : 'green') : 'default'}
                    icon={<Car className="h-4 w-4 text-muted-foreground" />}
                  />
                </div>
              </div>
            </div>

            {/* Total deviation box */}
            <div className="flex-shrink-0 min-w-[160px]">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 pl-0.5">Totalt</p>
              <motion.div variants={cardVariants}>
                <Card className={cn(
                  'border bg-card/80 h-[calc(100%-24px)]',
                  !hasEstimation ? 'border-border/50' :
                  totalDeviation > 0 ? 'border-red-500/50 bg-red-500/5' :
                  'border-emerald-500/50 bg-emerald-500/5'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Avvikelse</p>
                        <p className={cn(
                          'text-2xl font-bold tabular-nums',
                          !hasEstimation ? 'text-foreground' :
                          totalDeviation > 0 ? 'text-red-400' : 'text-emerald-400'
                        )}>
                          {formatDeviation(totalDeviation)}
                        </p>
                        {hasEstimation && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {estimatedWork + estimatedTravel}h → {actualWork + actualTravel}h
                          </p>
                        )}
                      </div>
                      <div className={cn(
                        'shrink-0 rounded-md p-2',
                        !hasEstimation ? 'bg-muted/50' :
                        totalDeviation > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'
                      )}>
                        {totalDeviation === 0
                          ? <Minus className="h-4 w-4 text-muted-foreground" />
                          : totalDeviation > 0
                          ? <TrendingUp className="h-4 w-4 text-red-400" />
                          : <TrendingDown className="h-4 w-4 text-emerald-400" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Deviation detail rows */}
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

          {/* Bar chart – Montage & Resa only */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Kalkyl vs Utfall (timmar)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }} barCategoryGap="40%">
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
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, color: 'hsl(var(--muted-foreground))' }} />
                  <Bar dataKey="Kalkyl" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} opacity={0.55} maxBarSize={72} />
                  <Bar dataKey="Utfall" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} maxBarSize={72} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
