import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, ReactFlowProvider,
  Node, Edge, Connection, NodeChange, applyNodeChanges, MarkerType,
} from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { FactoryNode } from './FactoryNode';
import { signBlueprintUrl } from './useProductionData';
import { ProductionFactory, ProductionObject, ProductionFlow } from './types';

const nodeTypes = { factory: FactoryNode };

interface Props {
  factories: ProductionFactory[];
  objects: ProductionObject[];
  flows: ProductionFlow[];
  onOpenFactory: (id: string) => void;
  onFactoriesChange: (fs: ProductionFactory[]) => void;
  onFlowsChange: (fs: ProductionFlow[]) => void;
}

export function OverviewCanvasInner({
  factories, objects, flows, onOpenFactory, onFactoriesChange, onFlowsChange,
}: Props) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const f of factories) {
        if (f.blueprint_url) {
          const url = await signBlueprintUrl(f.blueprint_url);
          if (url) map[f.id] = url;
        }
      }
      if (!cancelled) setThumbs(map);
    })();
    return () => { cancelled = true; };
  }, [factories]);

  const nodes: Node[] = useMemo(
    () =>
      factories.map((f) => ({
        id: f.id,
        type: 'factory',
        position: { x: f.overview_x, y: f.overview_y },
        data: {
          name: f.name,
          color: f.color,
          blueprintUrl: thumbs[f.id],
          objectCount: objects.filter((o) => o.factory_id === f.id).length,
          onOpen: () => onOpenFactory(f.id),
        },
        width: 260,
        height: 200,
      })),
    [factories, thumbs, objects, onOpenFactory]
  );

  const edges: Edge[] = useMemo(
    () =>
      flows
        .filter((f) => f.source_factory_id && f.target_factory_id && f.source_factory_id !== f.target_factory_id && !f.source_object_id)
        .map((f) => ({
          id: f.id,
          source: f.source_factory_id!,
          target: f.target_factory_id!,
          type: 'smoothstep',
          animated: true,
          label: f.label || (f.volume ? `${f.volume} st/h` : ''),
          style: { stroke: f.color, strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: f.color },
          labelStyle: { fontSize: 12, fontWeight: 600, fill: '#18323A' },
          labelBgStyle: { fill: 'white' },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        })),
    [flows]
  );

  const onNodesChange = (changes: NodeChange[]) => {
    const next = applyNodeChanges(changes, nodes);
    const updated = factories.map((f) => {
      const n = next.find((n) => n.id === f.id);
      if (!n) return f;
      const nx = n.position?.x ?? f.overview_x;
      const ny = n.position?.y ?? f.overview_y;
      if (nx !== f.overview_x || ny !== f.overview_y) {
        supabase.from('production_factories').update({ overview_x: nx, overview_y: ny } as any).eq('id', f.id);
        return { ...f, overview_x: nx, overview_y: ny };
      }
      return f;
    });
    onFactoriesChange(updated);
  };

  const onConnect = async (c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    const first = factories[0];
    if (!first) return;
    const { data } = await supabase
      .from('production_flows')
      .insert({
        project_id: first.project_id,
        source_factory_id: c.source,
        target_factory_id: c.target,
        color: '#1C7F72',
        flow_type: 'transport',
      })
      .select()
      .single();
    if (data) onFlowsChange([...flows, data as any]);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      fitView
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ backgroundColor: '#eef2f0' }}
    >
      <Background gap={24} color="#c9d1cf" />
      <Controls position="bottom-left" />
      <MiniMap pannable zoomable style={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }} />
    </ReactFlow>
  );
}

export function OverviewCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <OverviewCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
