import { cn } from '@/lib/utils';
import { Status } from '@/data/projectData';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'Slutförd':
        return 'bg-status-completed/15 text-status-completed border-status-completed/30';
      case 'Pågår':
        return 'bg-status-in-progress/15 text-status-in-progress border-status-in-progress/30';
      case 'Försenad':
        return 'bg-status-delayed/15 text-status-delayed border-status-delayed/30';
      case 'Ej påbörjad':
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        getStatusStyles(),
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <span
        className={cn(
          'mr-1.5 h-1.5 w-1.5 rounded-full',
          status === 'Slutförd' && 'bg-status-completed',
          status === 'Pågår' && 'bg-status-in-progress',
          status === 'Försenad' && 'bg-status-delayed',
          status === 'Ej påbörjad' && 'bg-muted-foreground'
        )}
      />
      {status}
    </span>
  );
}
