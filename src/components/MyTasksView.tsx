import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, getDisplayName, UserProfile } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';
import { UserSelect } from '@/components/UserSelect';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, CalendarIcon, Trash2, Inbox, Folder, User as UserIcon, Send, X, GripVertical, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Status } from '@/data/projectData';
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TASK_STATUSES = ['Ej påbörjad', 'Pågår', 'Slutförd', 'Försenad'] as const;
const BUCKET_COLORS = [
  { name: 'Petrol', value: 'hsl(190 35% 20%)' },
  { name: 'Grön', value: 'hsl(170 55% 35%)' },
  { name: 'Blå', value: 'hsl(217 70% 50%)' },
  { name: 'Orange', value: 'hsl(25 90% 53%)' },
  { name: 'Lila', value: 'hsl(265 60% 55%)' },
  { name: 'Rosa', value: 'hsl(330 65% 55%)' },
];

interface TaskBucket {
  id: string;
  name: string;
  owner_id: string;
  project_id: string | null;
  color: string | null;
  sort_order: number;
}

interface TaskRow {
  id: string;
  name: string;
  responsible: string;
  deadline: string | null;
  project_id: string | null;
  comment: string | null;
  status: string;
  created_by: string | null;
  owner_id: string | null;
  assigned_to: string | null;
  bucket_id: string | null;
  sort_order: number;
}

export function MyTasksView() {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { projects } = useProjectDataContext();
  const qc = useQueryClient();
  const [viewUser, setViewUser] = useState<string>('me');
  const [newBucketOpen, setNewBucketOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const [deleteBucketId, setDeleteBucketId] = useState<string | null>(null);

  const effectiveUserId = viewUser === 'me' ? user?.id : viewUser;
  const currentProfile = useMemo(() => profiles.find((p) => p.user_id === user?.id), [profiles, user]);

  // ---- Queries ----
  const { data: buckets = [] } = useQuery({
    queryKey: ['task-buckets'],
    queryFn: async (): Promise<TaskBucket[]> => {
      const { data } = await supabase.from('task_buckets').select('*').order('sort_order');
      return (data || []) as TaskBucket[];
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: async (): Promise<TaskRow[]> => {
      const { data } = await supabase.from('tasks').select('*').order('sort_order');
      return (data || []) as TaskRow[];
    },
    enabled: !!user,
  });

  // ---- Mutations ----
  const ensureBucket = async (ownerId: string, projectId: string | null, fallbackName: string) => {
    const existing = buckets.find((b) => b.owner_id === ownerId && b.project_id === projectId);
    if (existing) return existing;
    const { data, error } = await supabase
      .from('task_buckets')
      .insert({
        name: fallbackName,
        owner_id: ownerId,
        project_id: projectId,
        sort_order: buckets.length,
        color: projectId ? null : BUCKET_COLORS[buckets.length % BUCKET_COLORS.length].value,
      })
      .select()
      .single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['task-buckets'] });
    return data as TaskBucket;
  };

  const createBucket = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user?.id) throw new Error('No user');
      const { error } = await supabase.from('task_buckets').insert({
        name, owner_id: user.id, color, sort_order: buckets.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-buckets'] });
      toast.success('Bucket skapad');
    },
  });

  const renameBucket = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('task_buckets').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-buckets'] }),
  });

  const deleteBucket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_buckets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-buckets'] });
      qc.invalidateQueries({ queryKey: ['tasks-all'] });
      toast.success('Bucket borttagen');
    },
  });

  const addTask = useMutation({
    mutationFn: async (input: {
      name: string;
      bucket: TaskBucket | null;
      projectId: string | null;
      ownerId: string;
      responsibleName: string;
      assignedTo?: string | null;
    }) => {
      let bucket = input.bucket;
      if (!bucket) {
        const projName = input.projectId ? projects.find((p) => p.id === input.projectId)?.name || 'Projekt' : 'Att göra';
        bucket = await ensureBucket(input.ownerId, input.projectId, projName);
      }
      const { error } = await supabase.from('tasks').insert({
        name: input.name,
        responsible: input.responsibleName,
        project_id: input.projectId,
        bucket_id: bucket.id,
        owner_id: input.ownerId,
        assigned_to: input.assignedTo || null,
        status: 'Ej påbörjad',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-all'] }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TaskRow> }) => {
      const { error } = await supabase.from('tasks').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks-all'] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks-all'] });
      toast.success('Uppgift borttagen');
    },
  });

  const reorderBuckets = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Optimistic cache update
      qc.setQueryData<TaskBucket[]>(['task-buckets'], (old) => {
        if (!old) return old;
        return old.map((b) => {
          const idx = orderedIds.indexOf(b.id);
          return idx === -1 ? b : { ...b, sort_order: idx };
        });
      });
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from('task_buckets').update({ sort_order: idx }).eq('id', id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-buckets'] }),
  });

  // ---- Derived columns ----
  const visibleBuckets = useMemo(() => {
    if (!effectiveUserId) return [] as TaskBucket[];
    return buckets
      .filter((b) => b.owner_id === effectiveUserId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [buckets, effectiveUserId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visibleBuckets.map((b) => b.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(ids, oldIdx, newIdx);
    reorderBuckets.mutate(reordered);
  };

  const tasksByBucket = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    tasks.forEach((t) => {
      if (!t.bucket_id) return;
      const arr = map.get(t.bucket_id) || [];
      arr.push(t);
      map.set(t.bucket_id, arr);
    });
    return map;
  }, [tasks]);

  // Delegated to viewed user (tasks where they are assignee but not owner)
  const delegatedToMe = useMemo(() => {
    if (!effectiveUserId) return [];
    return tasks.filter((t) => t.assigned_to === effectiveUserId && t.owner_id !== effectiveUserId);
  }, [tasks, effectiveUserId]);

  // ---- Render ----
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mina uppgifter</h1>
          <p className="text-xs text-muted-foreground">Personliga buckets och delegerade uppgifter</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewUser} onValueChange={setViewUser}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">
                <div className="flex items-center gap-2">
                  {currentProfile && <UserAvatar profile={currentProfile} size="xs" />}
                  <span>Mig själv</span>
                </div>
              </SelectItem>
              {profiles
                .filter((p) => p.user_id !== user?.id)
                .map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    <div className="flex items-center gap-2">
                      <UserAvatar profile={p} size="xs" />
                      <span>{getDisplayName(p)}</span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setNewBucketOpen(true)} disabled={viewUser !== 'me'}>
            <Plus className="mr-1 h-4 w-4" />
            Ny bucket
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="inline-flex h-full items-start gap-3 p-4 min-w-full">
          {/* Delegated column (always first if any) */}
          {delegatedToMe.length > 0 && (
            <BucketColumn
              key="__delegated"
              title="Tilldelat mig"
              subtitle="Från andra"
              color="hsl(25 90% 53%)"
              icon={<Send className="h-3.5 w-3.5" />}
              tasks={delegatedToMe}
              profiles={profiles}
              projects={projects}
              readOnly={viewUser !== 'me'}
              onCardClick={setEditTask}
              onAddCard={null}
              onToggleComplete={(t) => updateTask.mutate({
                id: t.id,
                patch: { status: t.status === 'Slutförd' ? 'Ej påbörjad' : 'Slutförd' },
              })}
            />
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleBuckets.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
              <div className="inline-flex items-start gap-3">
                {visibleBuckets.map((bucket) => {
                  const project = bucket.project_id ? projects.find((p) => p.id === bucket.project_id) : null;
                  const bucketTasks = (tasksByBucket.get(bucket.id) || []).sort((a, b) => a.sort_order - b.sort_order);
                  return (
                    <SortableBucket key={bucket.id} id={bucket.id} disabled={viewUser !== 'me'}>
                      {(dragHandle) => (
                        <BucketColumn
                          title={bucket.name}
                          subtitle={project ? `${project.code || ''} ${project.name}`.trim() : 'Personlig'}
                          color={bucket.color || 'hsl(190 35% 20%)'}
                          icon={project ? <Folder className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                          tasks={bucketTasks}
                          profiles={profiles}
                          projects={projects}
                          readOnly={viewUser !== 'me'}
                          dragHandle={dragHandle}
                          onCardClick={setEditTask}
                          onAddCard={
                            viewUser === 'me'
                              ? (name) => addTask.mutate({
                                  name,
                                  bucket,
                                  projectId: bucket.project_id,
                                  ownerId: bucket.owner_id,
                                  responsibleName: currentProfile ? getDisplayName(currentProfile) : '',
                                })
                              : null
                          }
                          onToggleComplete={(t) => updateTask.mutate({
                            id: t.id,
                            patch: { status: t.status === 'Slutförd' ? 'Ej påbörjad' : 'Slutförd' },
                          })}
                          onRename={viewUser === 'me' && !bucket.project_id
                            ? (name) => renameBucket.mutate({ id: bucket.id, name })
                            : null}
                          onDelete={viewUser === 'me' ? () => setDeleteBucketId(bucket.id) : null}
                        />
                      )}
                    </SortableBucket>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Project picker to add a project-bucket */}
          {viewUser === 'me' && (
            <AddProjectBucketColumn
              projects={projects.filter((p) => p.status !== 'Avslutat')}
              existingProjectIds={visibleBuckets.map((b) => b.project_id).filter(Boolean) as string[]}
              onPick={async (projectId) => {
                const proj = projects.find((p) => p.id === projectId);
                if (!proj || !user?.id) return;
                await ensureBucket(user.id, projectId, proj.name);
                toast.success(`Bucket skapad för ${proj.name}`);
              }}
            />
          )}

          {visibleBuckets.length === 0 && delegatedToMe.length === 0 && (
            <div className="flex h-64 w-80 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/50 text-sm text-muted-foreground">
              <Inbox className="mb-2 h-8 w-8 opacity-40" />
              {viewUser === 'me' ? 'Inga buckets ännu' : 'Användaren har inga buckets'}
            </div>
          )}
        </div>
      </div>

      {/* New bucket dialog */}
      <NewBucketDialog
        open={newBucketOpen}
        onOpenChange={setNewBucketOpen}
        onCreate={(name, color) => createBucket.mutate({ name, color })}
      />

      {/* Edit task */}
      {editTask && (
        <EditTaskDialog
          task={editTask}
          buckets={buckets.filter((b) => b.owner_id === editTask.owner_id)}
          profiles={profiles}
          projects={projects}
          onClose={() => setEditTask(null)}
          onSave={(patch) => {
            updateTask.mutate({ id: editTask.id, patch });
            setEditTask(null);
          }}
          onDelete={() => {
            deleteTask.mutate(editTask.id);
            setEditTask(null);
          }}
        />
      )}

      {/* Delete bucket confirm */}
      <AlertDialog open={!!deleteBucketId} onOpenChange={(o) => !o && setDeleteBucketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort bucket?</AlertDialogTitle>
            <AlertDialogDescription>
              Alla uppgifter i bucketen tas också bort. Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteBucketId) deleteBucket.mutate(deleteBucketId);
                setDeleteBucketId(null);
              }}
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =================== Sortable wrapper ===================
function SortableBucket({
  id, disabled, children,
}: {
  id: string;
  disabled?: boolean;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  const handle = disabled ? null : (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground touch-none"
      aria-label="Flytta bucket"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
}

// =================== Bucket column ===================
function BucketColumn({
  title, subtitle, color, icon, tasks, profiles, projects, onCardClick, onAddCard,
  onToggleComplete, onRename, onDelete, readOnly, dragHandle,
}: {
  title: string;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
  tasks: TaskRow[];
  profiles: UserProfile[];
  projects: Array<{ id: string; name: string; code?: string }>;
  onCardClick: (task: TaskRow) => void;
  onAddCard: ((name: string) => void) | null;
  onToggleComplete: (task: TaskRow) => void;
  onRename?: ((name: string) => void) | null;
  onDelete?: (() => void) | null;
  readOnly?: boolean;
  dragHandle?: React.ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  const commitAdd = () => {
    if (newName.trim() && onAddCard) onAddCard(newName.trim());
    setNewName('');
    setAdding(false);
  };

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col rounded-xl border border-border/40 bg-card/60 shadow-sm">
      {/* Color stripe */}
      <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-2">
        <div className="min-w-0 flex-1">
          {renaming && onRename ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { onRename(titleDraft.trim() || title); setRenaming(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.currentTarget.blur(); }
                if (e.key === 'Escape') { setTitleDraft(title); setRenaming(false); }
              }}
              className="h-7 text-sm font-semibold"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{icon}</span>
              <h3 className="truncate text-sm font-semibold">{title}</h3>
              <span className="ml-auto rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                {tasks.length}
              </span>
            </div>
          )}
          {subtitle && !renaming && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {(onRename || onDelete) && !readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRename && (
                <DropdownMenuItem onClick={() => { setTitleDraft(title); setRenaming(true); }}>
                  Byt namn
                </DropdownMenuItem>
              )}
              {onRename && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Ta bort bucket
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-1.5 overflow-y-auto px-2 pb-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            profiles={profiles}
            projects={projects}
            onClick={() => onCardClick(task)}
            onToggleComplete={() => onToggleComplete(task)}
          />
        ))}
      </div>

      {/* Add card */}
      {onAddCard && (
        <div className="border-t border-border/40 p-2">
          {adding ? (
            <div className="space-y-1.5">
              <Textarea
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitAdd(); }
                  if (e.key === 'Escape') { setNewName(''); setAdding(false); }
                }}
                placeholder="Skriv titel..."
                rows={2}
                className="text-sm resize-none"
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 flex-1 text-xs" onClick={commitAdd}>Lägg till</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setNewName(''); setAdding(false); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Lägg till kort
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =================== Task card ===================
function TaskCard({
  task, profiles, projects, onClick, onToggleComplete,
}: {
  task: TaskRow;
  profiles: UserProfile[];
  projects: Array<{ id: string; name: string; code?: string }>;
  onClick: () => void;
  onToggleComplete: () => void;
}) {
  const assignee = task.assigned_to ? profiles.find((p) => p.user_id === task.assigned_to) : null;
  const project = task.project_id ? projects.find((p) => p.id === task.project_id) : null;
  const isCompleted = task.status === 'Slutförd';

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-md border border-border/50 bg-background p-2 text-sm shadow-sm transition hover:border-primary/40 hover:shadow",
        isCompleted && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={onToggleComplete}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm leading-snug", isCompleted && "line-through")}>{task.name}</p>
          {(task.deadline || project || assignee || task.status !== 'Ej påbörjad') && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {task.status !== 'Ej påbörjad' && <StatusBadge status={task.status as Status} size="sm" />}
              {task.deadline && (
                <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <CalendarIcon className="h-2.5 w-2.5" />
                  {task.deadline}
                </span>
              )}
              {project && (
                <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  <Folder className="h-2.5 w-2.5" />
                  {project.code || project.name}
                </span>
              )}
              {assignee && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Send className="h-2.5 w-2.5" />
                  <UserAvatar profile={assignee} size="xs" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =================== Add project bucket ===================
function AddProjectBucketColumn({
  projects, existingProjectIds, onPick,
}: {
  projects: Array<{ id: string; name: string; code?: string }>;
  existingProjectIds: string[];
  onPick: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = projects.filter((p) => !existingProjectIds.includes(p.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-12 w-[300px] shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/50 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
          <Plus className="h-4 w-4" />
          Lägg till projekt-bucket
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-1" align="start">
        {available.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">Du har redan en bucket för alla aktiva projekt.</div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {available.map((p) => (
              <button
                key={p.id}
                onClick={() => { onPick(p.id); setOpen(false); }}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{p.code || '–'}</span>
                <span className="ml-1.5 text-muted-foreground">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// =================== New bucket dialog ===================
function NewBucketDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (name: string, color: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(BUCKET_COLORS[0].value);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), color);
    setName(''); setColor(BUCKET_COLORS[0].value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Ny personlig bucket</DialogTitle>
            <DialogDescription>Skapa en bucket utan koppling till projekt.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label>Namn</Label>
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Inkomna, Idéer" />
            </div>
            <div className="grid gap-1.5">
              <Label>Färg</Label>
              <div className="flex flex-wrap gap-2">
                {BUCKET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition",
                      color === c.value ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button type="submit" disabled={!name.trim()}>Skapa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =================== Edit task dialog ===================
function EditTaskDialog({
  task, buckets, profiles, projects, onClose, onSave, onDelete,
}: {
  task: TaskRow;
  buckets: TaskBucket[];
  profiles: UserProfile[];
  projects: Array<{ id: string; name: string; code?: string }>;
  onClose: () => void;
  onSave: (patch: Partial<TaskRow>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(task.name);
  const [comment, setComment] = useState(task.comment || '');
  const [status, setStatus] = useState(task.status);
  const [deadline, setDeadline] = useState<Date | undefined>(task.deadline ? new Date(task.deadline) : undefined);
  const [bucketId, setBucketId] = useState(task.bucket_id || '');
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '');
  const [projectId, setProjectId] = useState(task.project_id || '');

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      comment: comment.trim() || null,
      status,
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
      bucket_id: bucketId || null,
      assigned_to: assignedTo || null,
      project_id: projectId || null,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Redigera uppgift</DialogTitle>
            <DialogDescription>Uppdatera, delegera eller flytta uppgiften.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label>Titel</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className={cn("justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, 'yyyy-MM-dd') : 'Inget'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus showWeekNumber className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Bucket</Label>
              <Select value={bucketId} onValueChange={setBucketId}>
                <SelectTrigger><SelectValue placeholder="Välj bucket" /></SelectTrigger>
                <SelectContent>
                  {buckets.map((b) => {
                    const proj = b.project_id ? projects.find((p) => p.id === b.project_id) : null;
                    return (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}{proj ? ` (${proj.code || proj.name})` : ' (personlig)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Projekt</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Inget" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget projekt</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Delegera till</Label>
              <Select
                value={assignedTo || 'none'}
                onValueChange={(v) => setAssignedTo(v === 'none' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen</SelectItem>
                  {profiles.map((p) => {
                    const n = getDisplayName(p);
                    if (!n) return null;
                    return (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        <div className="flex items-center gap-2">
                          <UserAvatar profile={p} size="xs" />
                          <span>{n}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Den delegerade ser kortet under "Tilldelat mig" och du behåller det i din bucket.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Kommentar</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />Ta bort
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Avbryt</Button>
              <Button type="submit" disabled={!name.trim()}>Spara</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
