import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfiles, getDisplayName } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';
import { StatusBadge } from '@/components/StatusBadge';
import { ClipboardList, Send, CalendarIcon } from 'lucide-react';
import type { Status } from '@/data/projectData';

interface ProjectTask {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  comment: string | null;
  owner_id: string | null;
  assigned_to: string | null;
  bucket_id: string | null;
  created_at: string;
}

export function ProjectTasksList({ projectId }: { projectId: string }) {
  const { profiles } = useProfiles();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async (): Promise<ProjectTask[]> => {
      const { data } = await supabase
        .from('tasks')
        .select('id,name,status,deadline,comment,owner_id,assigned_to,bucket_id,created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      return (data || []) as ProjectTask[];
    },
  });

  const profileById = (id: string | null) => id ? profiles.find((p) => p.user_id === id) : null;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Laddar uppgifter…</p>;
  }

  if (tasks.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClipboardList className="h-3 w-3" />
        Inga uppgifter kopplade till projektet ännu.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <ClipboardList className="h-3 w-3 text-primary/70" />
        Uppgifter ({tasks.length})
      </div>
      <div className="space-y-1 rounded-md border border-border/40 bg-background/60 p-1.5 max-h-64 overflow-y-auto">
        {tasks.map((t) => {
          const owner = profileById(t.owner_id);
          const assignee = profileById(t.assigned_to);
          const done = t.status === 'Slutförd';
          return (
            <div key={t.id} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50 text-xs">
              <StatusBadge status={t.status as Status} size="sm" />
              <span className={done ? 'line-through text-muted-foreground flex-1 truncate' : 'flex-1 truncate'}>
                {t.name}
              </span>
              {t.deadline && (
                <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <CalendarIcon className="h-2.5 w-2.5" />
                  {t.deadline}
                </span>
              )}
              {owner && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`Ägare: ${getDisplayName(owner)}`}>
                  <UserAvatar profile={owner} size="xs" />
                </span>
              )}
              {assignee && assignee.user_id !== owner?.user_id && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground" title={`Delegerad till: ${getDisplayName(assignee)}`}>
                  <Send className="h-2.5 w-2.5" />
                  <UserAvatar profile={assignee} size="xs" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
