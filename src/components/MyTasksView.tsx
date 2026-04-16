import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, getDisplayName, UserProfile } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';
import { UserSelect } from '@/components/UserSelect';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CalendarDays, ClipboardList, Filter, Layers, Clock, AlertTriangle, Plus, CalendarIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Status } from '@/data/projectData';

type StatusFilter = 'all' | 'Ej påbörjad' | 'Pågår' | 'Försenad';
const EXCLUDED_STATUSES = ['Slutförd'];
const TASK_STATUSES = ['Ej påbörjad', 'Pågår', 'Slutförd', 'Försenad'] as const;

interface Task {
  id: string;
  name: string;
  responsible: string;
  deadline: string | null;
  project_id: string | null;
  comment: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  project_name?: string;
}

export function MyTasksView() {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { projects } = useProjectDataContext();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>('me');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const currentProfile = useMemo(
    () => profiles.find((p) => p.user_id === user?.id),
    [profiles, user]
  );

  const selectedDisplayName = useMemo(() => {
    if (selectedUser === 'me') return currentProfile ? getDisplayName(currentProfile) : '';
    if (selectedUser === 'all') return '';
    const p = profiles.find((pr) => pr.user_id === selectedUser);
    return p ? getDisplayName(p) : '';
  }, [selectedUser, profiles, currentProfile]);

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      const projectMap = new Map(projects.map((p) => [p.id, p.name]));
      return (tasksData || []).map((t: any) => ({
        ...t,
        project_name: t.project_id ? projectMap.get(t.project_id) || 'Okänt projekt' : null,
      })) as Task[];
    },
    enabled: !!user,
  });

  // Mutations
  const addTask = useMutation({
    mutationFn: async (task: { name: string; responsible: string; deadline?: string; project_id?: string; comment?: string; status: string }) => {
      const { error } = await supabase.from('tasks').insert({
        name: task.name,
        responsible: task.responsible,
        deadline: task.deadline || null,
        project_id: task.project_id || null,
        comment: task.comment || null,
        status: task.status,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Uppgift skapad');
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast.success('Uppgift borttagen');
    },
  });

  // Filters
  const filterByUser = (items: Task[]) => {
    if (selectedUser === 'all') return items;
    const name = selectedDisplayName;
    if (!name) return [];
    return items.filter((item) => item.responsible === name);
  };

  const filterByStatus = (items: Task[]) => {
    const nonCompleted = items.filter((item) => !EXCLUDED_STATUSES.includes(item.status));
    if (statusFilter === 'all') return nonCompleted;
    return nonCompleted.filter((item) => item.status === statusFilter);
  };

  const filteredTasks = useMemo(
    () => filterByStatus(filterByUser(tasks)),
    [tasks, selectedUser, selectedDisplayName, statusFilter]
  );

  const counts = useMemo(() => {
    const userFiltered = filterByUser(tasks);
    const nonCompleted = userFiltered.filter((t) => !EXCLUDED_STATUSES.includes(t.status));
    return {
      total: nonCompleted.length,
      notStarted: nonCompleted.filter((t) => t.status === 'Ej påbörjad').length,
      inProgress: nonCompleted.filter((t) => t.status === 'Pågår').length,
      delayed: nonCompleted.filter((t) => t.status === 'Försenad').length,
    };
  }, [tasks, selectedUser, selectedDisplayName]);

  const handleComplete = (task: Task) => {
    const newStatus = task.status === 'Slutförd' ? 'Ej påbörjad' : 'Slutförd';
    updateTaskStatus.mutate({ id: task.id, status: newStatus });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mina uppgifter</h1>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Ny uppgift
        </Button>
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
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={counts.total} /></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(217,70%,55%)] to-[hsl(217,70%,40%)] p-5 shadow-md">
          <ClipboardList className="absolute top-3 right-3 h-8 w-8 text-white/10" />
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Ej påbörjad</p>
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={counts.notStarted} /></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(25,95%,53%)] to-[hsl(25,90%,42%)] p-5 shadow-md">
          <Clock className="absolute top-3 right-3 h-8 w-8 text-white/10" />
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Pågår</p>
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={counts.inProgress} /></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(0,45%,45%)] to-[hsl(0,40%,35%)] p-5 shadow-md">
          <AlertTriangle className="absolute top-3 right-3 h-8 w-8 text-white/10" />
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Försenad</p>
          <p className="text-3xl font-bold text-white mt-1"><AnimatedNumber value={counts.delayed} /></p>
        </motion.div>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Inga uppgifter matchar filtret.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <Checkbox
                  checked={task.status === 'Slutförd'}
                  onCheckedChange={() => handleComplete(task)}
                  className="shrink-0"
                />
                {selectedUser === 'all' && (
                  <ResponsibleAvatar name={task.responsible} profiles={profiles} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", task.status === 'Slutförd' && "line-through text-muted-foreground")}>{task.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.project_name || 'Ingen projektkoppling'}
                    {task.comment ? ` · ${task.comment}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {task.deadline && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Deadline: {task.deadline}
                    </span>
                  )}
                  <StatusBadge status={task.status as Status} size="sm" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTaskId(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add task dialog */}
      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        profiles={profiles}
        projects={projects}
        onAdd={(task) => addTask.mutate(task)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort uppgift?</AlertDialogTitle>
            <AlertDialogDescription>Är du säker på att du vill ta bort denna uppgift?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTaskId) { deleteTask.mutate(deleteTaskId); setDeleteTaskId(null); } }}>
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Add Task Dialog ---
function AddTaskDialog({
  open, onOpenChange, profiles, projects, onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: UserProfile[];
  projects: Array<{ id: string; name: string }>;
  onAdd: (task: { name: string; responsible: string; deadline?: string; project_id?: string; comment?: string; status: string }) => void;
}) {
  const [name, setName] = useState('');
  const [responsible, setResponsible] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [projectId, setProjectId] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('Ej påbörjad');

  const resetForm = () => {
    setName(''); setResponsible(''); setDeadline(undefined); setProjectId(''); setComment(''); setStatus('Ej påbörjad');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !responsible.trim()) return;
    onAdd({
      name: name.trim(),
      responsible: responsible.trim(),
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : undefined,
      project_id: projectId || undefined,
      comment: comment.trim() || undefined,
      status,
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ny uppgift</DialogTitle>
            <DialogDescription>Skapa en ny uppgift.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Uppgiftsnamn</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Boka hotell" />
            </div>
            <div className="grid gap-2">
              <Label>Ansvarig</Label>
              <UserSelect profiles={profiles} value={responsible || 'none'} onValueChange={(v) => setResponsible(v === 'none' ? '' : v)} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Projekt (valfritt)</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Inget projekt" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget projekt</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Deadline (valfritt)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, 'yyyy-MM-dd') : 'Välj datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Kommentar (valfritt)</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Skriv en kommentar..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button type="submit" disabled={!name.trim() || !responsible.trim()}>Skapa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Helper components ---
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
