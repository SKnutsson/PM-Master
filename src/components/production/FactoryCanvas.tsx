import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel, ReactFlowProvider,
  addEdge, applyNodeChanges, applyEdgeChanges,
  Node, Edge, Connection, NodeChange, EdgeChange, MarkerType,
} from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Upload, Plus, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ObjectNode } from './ObjectNode';
import { signBlueprintUrl } from './useProductionData';
import {
  ProductionFactory, ProductionObject, ProductionFlow, ObjectKind, OBJECT_PRESETS,
} from './types';

const nodeTypes = { object: ObjectNode };

interface Props {
  factory: ProductionFactory;
  objects: ProductionObject[];
  flows: ProductionFlow[];
  onFactoryChange: (f: ProductionFactory) => void;
  onObjectsChange: (objs: ProductionObject[]) => void;
  onFlowsChange: (fs: ProductionFlow[]) => void;
}

function edgeStyle(flow: ProductionFlow): Partial<Edge> {
  const width = Math.min(8, 1 + (flow.volume ?? 0) / 20);
  return {
    style: { stroke: flow.color, strokeWidth: width },
    markerEnd: { type: MarkerType.ArrowClosed, color: flow.color },
    label: flow.label || (flow.volume ? `${flow.volume} st/h` : ''),
    labelStyle: { fontSize: 11, fontWeight: 600, fill: '#18323A' },
    labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  };
}

export function FactoryCanvasInner({
  factory, objects, flows, onFactoryChange, onObjectsChange, onFlowsChange,
}: Props) {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProductionObject | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<ProductionFlow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimers = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!factory.blueprint_url) { setBgUrl(null); return; }
      if (factory.blueprint_url.startsWith('http')) { setBgUrl(factory.blueprint_url); return; }
      const url = await signBlueprintUrl(factory.blueprint_url);
      if (!cancelled) setBgUrl(url);
    })();
    return () => { cancelled = true; };
  }, [factory.blueprint_url]);

  const nodes: Node[] = useMemo(
    () =>
      objects.map((o) => ({
        id: o.id,
        type: 'object',
        position: { x: o.x, y: o.y },
        data: o as unknown as Record<string, unknown>,
        width: o.width,
        height: o.height,
        draggable: !o.locked,
        selectable: true,
      })),
    [objects]
  );

  const edges: Edge[] = useMemo(
    () =>
      flows
        .filter((f) => f.source_object_id && f.target_object_id)
        .map((f) => ({
          id: f.id,
          source: f.source_object_id!,
          target: f.target_object_id!,
          type: 'smoothstep',
          data: f as unknown as Record<string, unknown>,
          ...edgeStyle(f),
        })),
    [flows]
  );

  const scheduleSave = (id: string, patch: Partial<ProductionObject>) => {
    const timers = saveTimers.current;
    if (timers.get(id)) clearTimeout(timers.get(id));
    const t = setTimeout(async () => {
      await supabase.from('production_objects').update(patch as any).eq('id', id);
      timers.delete(id);
    }, 400);
    timers.set(id, t);
  };

  const onNodesChange = (changes: NodeChange[]) => {
    const next = applyNodeChanges(changes, nodes);
    // sync positions/dimensions back
    const updated = objects.map((o) => {
      const n = next.find((n) => n.id === o.id);
      if (!n) return o;
      const nx = n.position?.x ?? o.x;
      const ny = n.position?.y ?? o.y;
      const nw = (n as any).width ?? o.width;
      const nh = (n as any).height ?? o.height;
      if (nx !== o.x || ny !== o.y || nw !== o.width || nh !== o.height) {
        scheduleSave(o.id, { x: nx, y: ny, width: nw, height: nh });
        return { ...o, x: nx, y: ny, width: nw, height: nh };
      }
      return o;
    });
    onObjectsChange(updated);
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    for (const ch of changes) {
      if (ch.type === 'remove') {
        supabase.from('production_flows').delete().eq('id', ch.id);
      }
    }
    onFlowsChange(flows.filter((f) => !changes.some((c) => c.type === 'remove' && c.id === f.id)));
  };

  const onConnect = async (c: Connection) => {
    if (!c.source || !c.target) return;
    const src = objects.find((o) => o.id === c.source);
    const { data } = await supabase
      .from('production_flows')
      .insert({
        project_id: factory.project_id,
        source_object_id: c.source,
        target_object_id: c.target,
        source_factory_id: factory.id,
        target_factory_id: factory.id,
        color: src?.color || '#1C7F72',
        flow_type: 'material',
      })
      .select()
      .single();
    if (data) onFlowsChange([...flows, data as any]);
  };

  const addObject = async (kind: ObjectKind) => {
    const preset = OBJECT_PRESETS.find((p) => p.type === kind)!;
    const { data } = await supabase
      .from('production_objects')
      .insert({
        factory_id: factory.id,
        type: kind,
        name: preset.label,
        icon: preset.icon,
        color: preset.color,
        x: 120 + Math.random() * 200,
        y: 120 + Math.random() * 200,
        width: 140, height: 70,
      })
      .select()
      .single();
    if (data) onObjectsChange([...objects, data as any]);
  };

  const uploadBlueprint = async (file: File) => {
    const path = `${factory.project_id}/${factory.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('production-blueprints').upload(path, file, { upsert: true });
    if (error) { toast.error('Kunde inte ladda upp: ' + error.message); return; }
    await supabase.from('production_factories').update({ blueprint_url: path } as any).eq('id', factory.id);
    onFactoryChange({ ...factory, blueprint_url: path });
    toast.success('Ritning uppladdad');
  };

  const updateSelected = async (patch: Partial<ProductionObject>) => {
    if (!selected) return;
    const merged = { ...selected, ...patch } as ProductionObject;
    setSelected(merged);
    onObjectsChange(objects.map((o) => (o.id === merged.id ? merged : o)));
    await supabase.from('production_objects').update(patch as any).eq('id', selected.id);
  };
  const updateSelectedData = async (patch: Partial<ProductionObject['data']>) => {
    if (!selected) return;
    const data = { ...(selected.data || {}), ...patch };
    await updateSelected({ data } as any);
  };
  const updateSelectedFlow = async (patch: Partial<ProductionFlow>) => {
    if (!selectedFlow) return;
    const merged = { ...selectedFlow, ...patch };
    setSelectedFlow(merged);
    onFlowsChange(flows.map((f) => (f.id === merged.id ? merged : f)));
    await supabase.from('production_flows').update(patch as any).eq('id', selectedFlow.id);
  };
  const deleteSelected = async () => {
    if (!selected) return;
    await supabase.from('production_objects').delete().eq('id', selected.id);
    onObjectsChange(objects.filter((o) => o.id !== selected.id));
    setSelected(null);
  };

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => setSelected((n.data as any))}
        onEdgeClick={(_, e) => setSelectedFlow((e.data as any))}
        onPaneClick={() => { setSelected(null); setSelectedFlow(null); }}
        snapToGrid
        snapGrid={[10, 10]}
        fitView
        minZoom={0.1}
        maxZoom={4}
        panOnScroll={false}
        panOnDrag
        selectionOnDrag={false}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: '#f5f7f6' }}
      >
        {bgUrl && (
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-70"
            style={{
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
        )}
        <Background gap={20} size={1} color="#c9d1cf" />
        <Controls position="bottom-left" />
        <MiniMap
          pannable zoomable
          nodeColor={(n: any) => (n.data as any)?.color || '#1C7F72'}
          style={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
        />

        <Panel position="top-left" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-white p-2 shadow-sm">
            {OBJECT_PRESETS.map((p) => (
              <Button key={p.type} size="sm" variant="outline" onClick={() => addObject(p.type)} className="h-8 gap-1">
                <Plus className="h-3 w-3" />
                {p.label}
              </Button>
            ))}
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => fileRef.current?.click()}>
              {factory.blueprint_url ? <ImageIcon className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
              {factory.blueprint_url ? 'Byt ritning' : 'Ladda upp ritning'}
            </Button>
            <input
              ref={fileRef} type="file" className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => e.target.files?.[0] && uploadBlueprint(e.target.files[0])}
            />
          </div>
        </Panel>
      </ReactFlow>

      {/* Object side panel */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[340px] sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: selected.color }} />
                  Objekt
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div>
                  <Label>Namn</Label>
                  <Input value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Färg</Label>
                    <Input type="color" value={selected.color} onChange={(e) => updateSelected({ color: e.target.value })} className="h-10 p-1" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={selected.data?.status || 'ok'}
                      onValueChange={(v) => updateSelectedData({ status: v as any })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="warning">Varning</SelectItem>
                        <SelectItem value="bottleneck">Flaskhals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Kapacitet (st/h)</Label>
                    <Input type="number" value={selected.data?.capacity ?? ''} onChange={(e) => updateSelectedData({ capacity: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <Label className="text-xs">Cykeltid (s)</Label>
                    <Input type="number" value={selected.data?.cycle_time ?? ''} onChange={(e) => updateSelectedData({ cycle_time: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <Label className="text-xs">Bemanning</Label>
                    <Input type="number" value={selected.data?.staffing ?? ''} onChange={(e) => updateSelectedData({ staffing: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Anteckning</Label>
                  <Textarea rows={2} value={selected.data?.note || ''} onChange={(e) => updateSelectedData({ note: e.target.value })} />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.locked} onChange={(e) => updateSelected({ locked: e.target.checked })} />
                    Lås objekt
                  </label>
                  <Button size="sm" variant="destructive" onClick={deleteSelected}>
                    <Trash2 className="mr-1 h-3 w-3" /> Ta bort
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Flow side panel */}
      <Sheet open={!!selectedFlow} onOpenChange={(o) => !o && setSelectedFlow(null)}>
        <SheetContent className="w-[340px] sm:max-w-md">
          {selectedFlow && (
            <>
              <SheetHeader>
                <SheetTitle>Flöde</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div>
                  <Label>Etikett</Label>
                  <Input value={selectedFlow.label || ''} onChange={(e) => updateSelectedFlow({ label: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Volym (st/h)</Label>
                    <Input type="number" value={selectedFlow.volume ?? ''} onChange={(e) => updateSelectedFlow({ volume: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <Label className="text-xs">Batchstorlek</Label>
                    <Input type="number" value={selectedFlow.batch_size ?? ''} onChange={(e) => updateSelectedFlow({ batch_size: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <Label className="text-xs">Frekvens</Label>
                    <Input value={selectedFlow.frequency || ''} onChange={(e) => updateSelectedFlow({ frequency: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Ledtid (min)</Label>
                    <Input type="number" value={selectedFlow.lead_time ?? ''} onChange={(e) => updateSelectedFlow({ lead_time: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Typ</Label>
                    <Select value={selectedFlow.flow_type} onValueChange={(v) => updateSelectedFlow({ flow_type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="info">Information</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Färg</Label>
                    <Input type="color" value={selectedFlow.color} onChange={(e) => updateSelectedFlow({ color: e.target.value })} className="h-10 p-1" />
                  </div>
                </div>
                <Button
                  size="sm" variant="destructive" className="w-full"
                  onClick={async () => {
                    await supabase.from('production_flows').delete().eq('id', selectedFlow.id);
                    onFlowsChange(flows.filter((f) => f.id !== selectedFlow.id));
                    setSelectedFlow(null);
                  }}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Ta bort flöde
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function FactoryCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FactoryCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
