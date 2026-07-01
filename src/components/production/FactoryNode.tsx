import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Factory as FactoryIcon } from 'lucide-react';

export const FactoryNode = memo(({ data, selected }: NodeProps) => {
  const d: any = data;
  return (
    <div
      onDoubleClick={d.onOpen}
      className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-white shadow-md transition-all hover:shadow-lg ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{ borderColor: d.color }}
    >
      <Handle type="target" position={Position.Left} style={{ background: d.color, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: d.color, width: 10, height: 10 }} />
      <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ backgroundColor: d.color }}>
        <FactoryIcon className="h-4 w-4" />
        <span className="text-sm font-semibold truncate">{d.name}</span>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-3 text-center text-[11px] text-slate-500">
        {d.blueprintUrl ? (
          <img src={d.blueprintUrl} alt={d.name} className="h-full w-full object-contain" />
        ) : (
          <span>Ingen ritning uppladdad</span>
        )}
      </div>
      <div className="flex items-center justify-between border-t bg-white px-3 py-1.5 text-[10px] text-slate-500">
        <span>{d.objectCount} objekt</span>
        <span className="text-primary font-medium opacity-0 transition-opacity group-hover:opacity-100">
          Dubbelklicka för att öppna →
        </span>
      </div>
    </div>
  );
});
FactoryNode.displayName = 'FactoryNode';
