import { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { Wrench, Cog, Package, Layers, Lock, Flame, Boxes, Truck, ShieldCheck, PackageOpen, PackagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroupShape } from './types';

const ICONS: Record<string, any> = {
  welding: Flame, assembly: Wrench, machining: Cog, storage: Package,
  quality: ShieldCheck, inbound: PackagePlus, outbound: PackageOpen,
  packing: Boxes, other: Layers, transport: Truck,
};

function statusRing(status?: string) {
  if (status === 'bottleneck') return 'ring-2 ring-red-500';
  if (status === 'warning')    return 'ring-2 ring-amber-500';
  if (status === 'ok')         return 'ring-2 ring-emerald-500';
  return '';
}

function shapeClass(shape: GroupShape) {
  switch (shape) {
    case 'rect':    return 'rounded-none';
    case 'rounded': return 'rounded-xl';
    case 'circle':  return 'rounded-full';
    case 'pill':    return 'rounded-full';
    default:        return 'rounded-xl';
  }
}

export const ProductionGroupNode = memo(({ data, selected }: NodeProps) => {
  const d: any = data;
  const groupType = d.data?.group_type || 'other';
  const Icon = ICONS[groupType] || Layers;
  const shape: GroupShape = d.shape || 'rounded';
  const borderColor = d.border_color || d.color;

  return (
    <>
      <NodeResizer
        color={d.color}
        isVisible={selected && !d.locked}
        minWidth={80}
        minHeight={50}
        keepAspectRatio={shape === 'circle'}
      />
      <div
        className={cn(
          'group relative flex h-full w-full flex-col overflow-hidden shadow-sm transition-shadow bg-white/95 backdrop-blur',
          shapeClass(shape),
          selected ? 'shadow-lg' : '',
          statusRing(d.data?.status),
        )}
        style={{
          borderColor,
          borderWidth: d.border_width ?? 1,
          borderStyle: 'solid',
        }}
      >
        <Handle type="target" position={Position.Left}   style={{ background: d.color, width: 12, height: 12, border: '2px solid white' }} />
        <Handle type="source" position={Position.Right}  style={{ background: d.color, width: 12, height: 12, border: '2px solid white' }} />
        <Handle type="target" position={Position.Top}    style={{ background: d.color, width: 12, height: 12, border: '2px solid white' }} id="t" />
        <Handle type="source" position={Position.Bottom} style={{ background: d.color, width: 12, height: 12, border: '2px solid white' }} id="b" />

        <div
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: d.color }}
        >
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate flex-1">{d.name}</span>
          {d.locked && <Lock className="h-2.5 w-2.5 opacity-80" />}
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1 px-2 py-1.5 text-[10px] text-slate-600">
          {d.data?.capacity != null && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">{d.data.capacity} st/h</span>
          )}
          {d.data?.cycle_time != null && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5">{d.data.cycle_time}s</span>
          )}
          {d.data?.staffing != null && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5">{d.data.staffing} p</span>
          )}
        </div>
      </div>
    </>
  );
});
ProductionGroupNode.displayName = 'ProductionGroupNode';
