import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, getDisplayName, UserProfile } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, ClipboardList, Filter, Layers, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import type { Status } from '@/data/projectData';

type StatusFilter = 'all' | 'Ej påbörjad' | 'Pågår' | 'Försenad';
const EXCLUDED_STATUSES = ['Slutförd', 'Avslutat', 'Klar', 'Inlämnad'];

interface ActivityWithProject {
  id: string;
  name: string;
  status: string;
  responsible: string;
  start_date: string | null;
  end_date: string | null;
  phase: string | null;
  notes: string | null;
  project_id: string;
  project_name?: string;
}

interface DocItemWithProject {
  id: string;
  document_type: string;
  status: string;
  responsible: string | null;
  deadline: string | null;
  notes: string | null;
  project_id: string;
  project_name?: string;
}

export function MyTasksView() {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const [selectedUser, setSelectedUser] = useState<string>('me');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Determine the current user's display name
  const currentProfile = useMemo(
    () => profiles.find((p) => p.user_id === user?.id),
    [profiles, user]
  );

  const selectedDisplayName = useMemo(() => {
    if (selectedUser === 'me') {
      return currentProfile ? getDisplayName(currentProfile) : '';
    }
    if (selectedUser === 'all') return '';
    const p = profiles.find((pr) => pr.user_id === selectedUser);
    return p ? getDisplayName(p) : '';
  }, [selectedUser, profiles, currentProfile]);

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ['my-activities'],
    queryFn: async () => {
      const { data: acts } = await supabase
        .from('activities')
        .select('id, name, status, responsible, start_date, end_date, phase, notes, project_id');
      const { data: projects } = await supabase.from('projects').select('id, name');
      const projectMap = new Map((projects || []).map((p) => [p.id, p.name]));
      return (acts || []).map((a) => ({
        ...a,
        project_name: projectMap.get(a.project_id) || 'Okänt projekt',
      })) as ActivityWithProject[];
    },
  });

  // Fetch documentation items
  const { data: docItems = [] } = useQuery({
    queryKey: ['my-doc-items'],
    queryFn: async () => {
      const { data: docs } = await supabase
        .from('documentation_items')
        .select('id, document_type, status, responsible, deadline, notes, project_id');
      const { data: projects } = await supabase.from('projects').select('id, name');
      const projectMap = new Map((projects || []).map((p) => [p.id, p.name]));
      return (docs || []).map((d) => ({
        ...d,
        project_name: projectMap.get(d.project_id) || 'Okänt projekt',
      })) as DocItemWithProject[];
    },
  });

  // Filter logic
  const filterByUser = <T extends { responsible: string | null }>(items: T[]) => {
    if (selectedUser === 'all') return items;
    const name = selectedDisplayName;
    if (!name) return [];
    return items.filter((item) => item.responsible === name);
  };

  const filterByStatus = <T extends { status: string }>(items: T[]) => {
    const nonCompleted = items.filter((item) => !EXCLUDED_STATUSES.includes(item.status));
    if (statusFilter === 'all') return nonCompleted;
    return nonCompleted.filter((item) => item.status === statusFilter);
  };

  const filteredActivities = useMemo(
    () => filterByStatus(filterByUser(activities)),
    [activities, selectedUser, selectedDisplayName, statusFilter]
  );

  const filteredDocs = useMemo(
    () => filterByStatus(filterByUser(docItems)),
    [docItems, selectedUser, selectedDisplayName, statusFilter]
  );

  // Counts for badges
  const actCounts = useMemo(() => {
    const userFiltered = filterByUser(activities);
    return {
      total: userFiltered.length,
      notStarted: userFiltered.filter((a) => a.status === 'Ej påbörjad').length,
      inProgress: userFiltered.filter((a) => a.status === 'Pågår').length,
      delayed: userFiltered.filter((a) => a.status === 'Försenad').length,
    };
  }, [activities, selectedUser, selectedDisplayName]);

  const docCounts = useMemo(() => {
    const userFiltered = filterByUser(docItems);
    return {
      total: userFiltered.length,
      notStarted: userFiltered.filter((d) => d.status === 'Ej påbörjad').length,
      inProgress: userFiltered.filter((d) => d.status === 'Pågår').length,
      delayed: userFiltered.filter((d) => d.status === 'Försenad').length,
    };
  }, [docItems, selectedUser, selectedDisplayName]);

  const selectedProfile = useMemo(() => {
    if (selectedUser === 'me') return currentProfile;
    if (selectedUser === 'all') return null;
    return profiles.find((p) => p.user_id === selectedUser) || null;
  }, [selectedUser, profiles, currentProfile]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mina uppgifter</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Visa för:</span>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">
                <div className="flex items-center gap-2">
                  {currentProfile && <UserAvatar profile={currentProfile} size="xs" />}
                  <span>Mig själv</span>
                </div>
              </SelectItem>
              <SelectItem value="all">Alla</SelectItem>
              {profiles.map((p) => {
                const name = getDisplayName(p);
                if (!name || p.user_id === user?.id) return null;
                return (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    <div className="flex items-center gap-2">
                      <UserAvatar profile={p} size="xs" />
                      <span>{name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="Ej påbörjad">Ej påbörjad</SelectItem>
              <SelectItem value="Pågår">Pågår</SelectItem>
              <SelectItem value="Försenad">Försenad</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(168,30%,16%)] to-[hsl(168,40%,10%)] p-5 shadow-md">
          <Layers className="absolute top-3 right-3 h-8 w-8 text-white/10" />
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Totalt</p>
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={actCounts.total + docCounts.total} /></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(217,70%,55%)] to-[hsl(217,70%,40%)] p-5 shadow-md">
          <ClipboardList className="absolute top-3 right-3 h-8 w-8 text-white/10" />
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Ej påbörjad</p>
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={actCounts.notStarted + docCounts.notStarted} /></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(25,95%,53%)] to-[hsl(25,90%,42%)] p-5 shadow-md">
          <Clock className="absolute top-3 right-3 h-8 w-8 text-white/10" />
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Pågår</p>
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={actCounts.inProgress + docCounts.inProgress} /></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(0,45%,45%)] to-[hsl(0,40%,35%)] p-5 shadow-md">
          <AlertTriangle className="absolute top-3 right-3 h-8 w-8 text-white/10" />
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Försenad</p>
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={actCounts.delayed + docCounts.delayed} /></p>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Aktiviteter
            <Badge variant="secondary" className="ml-1">{filteredActivities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Dokumentation
            <Badge variant="secondary" className="ml-1">{filteredDocs.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          {filteredActivities.length === 0 ? (
            <EmptyState message="Inga aktiviteter matchar filtret." />
          ) : (
            <div className="space-y-2">
              {filteredActivities.map((a) => (
                <Card key={a.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    {selectedUser === 'all' && (
                      <ResponsibleAvatar name={a.responsible} profiles={profiles} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.project_name} {a.phase ? `· ${a.phase}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {a.start_date && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {a.start_date}{a.end_date ? ` → ${a.end_date}` : ''}
                        </span>
                      )}
                      <StatusBadge status={a.status as Status} size="sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs">
          {filteredDocs.length === 0 ? (
            <EmptyState message="Inga dokumentationsuppgifter matchar filtret." />
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((d) => (
                <Card key={d.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    {selectedUser === 'all' && d.responsible && (
                      <ResponsibleAvatar name={d.responsible} profiles={profiles} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.document_type}</p>
                      <p className="text-xs text-muted-foreground">{d.project_name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {d.deadline && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          Deadline: {d.deadline}
                        </span>
                      )}
                      <StatusBadge status={d.status as Status} size="sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResponsibleAvatar({ name, profiles }: { name: string; profiles: UserProfile[] }) {
  const profile = profiles.find((p) => getDisplayName(p) === name);
  if (profile) return <UserAvatar profile={profile} size="sm" />;
  return (
    <div className="flex items-center justify-center rounded-full bg-muted text-muted-foreground w-7 h-7 text-xs font-medium shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
      {message}
    </div>
  );
}
