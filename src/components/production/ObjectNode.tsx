import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Wrench, Cog, Package, Layers, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, any> = { wrench: Wrench, cog: Cog, package: Package, layers: Layers };

function statusRing(status?: string) {
  if (status === 'bottleneck') return 'ring-2 ring-red-500';
  if (status === 'warning') return 'ring-2 ring-amber-500';
  if (status === 'ok') return 'ring-2 ring-emerald-500';
  return '';
}

export const ObjectNode = memo(({ data, selected }: NodeProps) => {
  const d: any = data;
  const Icon = ICONS[d.icon || 'wrench'] || Wrench;
  return (
    <div
      className={cn(
        'group relative flex h-full w-full flex-col rounded-lg border shadow-sm transition-shadow bg-white/95 backdrop-blur',
        selected ? 'ring-2 ring-primary shadow-lg' : 'ring-0',
        statusRing(d.data?.status)
      )}
      style={{ borderColor: d.color }}
    >
      <Handle type="target" position={Position.Left} style={{ background: d.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: d.color, width: 8, height: 8 }} />
      <div
        className="flex items-center gap-1.5 rounded-t-lg px-2 py-1 text-[11px] font-semibold text-white"
        style={{ backgroundColor: d.color }}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate flex-1">{d.name}</span>
        {d.locked && <Lock className="h-2.5 w-2.5 opacity-80" />}
      </div>
      <div className="flex flex-1 items-center justify-center px-2 py-1.5 text-[10px] text-slate-600">
        {d.data?.capacity != null && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">{d.data.capacity} st/h</span>
        )}
        {d.data?.cycle_time != null && (
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">{d.data.cycle_time}s</span>
        )}
        {d.data?.staffing != null && (
          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">{d.data.staffing} p</span>
        )}
      </div>
    </div>
  );
});
ObjectNode.displayName = 'ObjectNode';
