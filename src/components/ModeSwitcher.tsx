import { ClipboardList, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppMode, AppMode } from '@/contexts/AppModeContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect } from 'react';

interface Props {
  collapsed?: boolean;
}

const allOpts: { id: AppMode; label: string; icon: typeof ClipboardList }[] = [
  { id: 'pm', label: 'Projekt', icon: ClipboardList },
  { id: 'crm', label: 'CRM', icon: Briefcase },
];

export function ModeSwitcher({ collapsed }: Props) {
  const { mode, setMode } = useAppMode();
  const { canAccessCrm, loading } = usePermissions();
  const opts = allOpts.filter((o) => (o.id === 'crm' ? canAccessCrm : true));

  useEffect(() => {
    if (loading) return;
    if (mode === 'crm' && !canAccessCrm) setMode('pm');
  }, [loading, mode, canAccessCrm, setMode]);

  if (opts.length <= 1) return null;

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 px-1">
        {opts.map((o) => {
          const active = mode === o.id;
          return (
            <Tooltip key={o.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setMode(o.id)}
                  className={cn(
                    'flex h-9 w-full items-center justify-center rounded-md transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50'
                  )}
                >
                  <o.icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">{o.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-sidebar-accent/40 p-1">
      {opts.map((o) => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            onClick={() => setMode(o.id)}
            className={cn(
              'flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-all',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
