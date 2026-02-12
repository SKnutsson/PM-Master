import { cn } from '@/lib/utils';

export interface LegendItem {
  color: string;
  label: string;
}

interface StatusLegendProps {
  items: LegendItem[];
  showTodayMarker?: boolean;
  className?: string;
}

export function StatusLegend({ items, showTodayMarker = false, className }: StatusLegendProps) {
  return (
    <div className={cn('flex items-center gap-4 text-xs flex-wrap', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={cn('h-2.5 w-5 rounded-sm', item.color)} />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
      {showTodayMarker && (
        <div className="flex items-center gap-1.5 ml-2">
          <div className="h-3 w-0.5 bg-destructive rounded" />
          <span className="text-muted-foreground">Idag</span>
        </div>
      )}
    </div>
  );
}
