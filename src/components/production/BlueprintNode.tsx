import { memo } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';

/**
 * A background node that lives inside the flow coordinate system.
 * This is what makes the blueprint zoom/pan together with everything else.
 */
export const BlueprintNode = memo(({ data, selected }: NodeProps) => {
  const d: any = data;
  return (
    <>
      <NodeResizer
        color="#1E4C7A"
        isVisible={selected && !d.locked}
        minWidth={200}
        minHeight={150}
      />
      <div
        className="h-full w-full"
        style={{
          backgroundImage: d.url ? `url("${d.url}")` : undefined,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          opacity: d.opacity ?? 0.7,
          border: selected ? '1px dashed #1E4C7A' : '1px dashed transparent',
        }}
      />
    </>
  );
});
BlueprintNode.displayName = 'BlueprintNode';
