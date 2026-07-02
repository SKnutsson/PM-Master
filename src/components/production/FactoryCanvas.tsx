import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel, ReactFlowProvider,
  applyNodeChanges, applyEdgeChanges, useReactFlow,
  Node, Edge, Connection, NodeChange, EdgeChange, MarkerType, BackgroundVariant,
} from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import {
  Upload, Plus, Trash2, ImageIcon, Play, Pause, RotateCcw, Lock, Unlock, Square, Circle, RectangleHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProductionGroupNode } from './ProductionGroupNode';
import { BlueprintNode } from './BlueprintNode';
import { signBlueprintUrl } from './useProductionData';
import {
  ProductionFactory, ProductionObject, ProductionFlow, GroupShape, GROUP_TYPES, FLOW_COLORS,
} from './types';

const nodeTypes = { productionGroup: ProductionGroupNode, blueprint: BlueprintNode };

interface Props {
  factory: ProductionFactory;
  objects: ProductionObject[];
  flows: ProductionFlow[];
  onFactoryChange: (f: ProductionFactory) => void;
  onObjectsChange: (objs: ProductionObject[]) => void;
  onFlowsChange: (fs: ProductionFlow[]) => void;
}

function edgeStyle(flow: ProductionFlow, playing: boolean): Partial<Edge> {
  const width = Math.min(10, 1.5 + (flow.volume ?? 0) / 15);
  const color = flow.color || FLOW_COLORS[flow.flow_type] || '#1E4C7A';
  return {
    style: { stroke: color, strokeWidth: width },
    animated: playing,
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 22, height: 22 },
    label: flow.label || (flow.volume ? `${flow.volume} st/h` : ''),
    labelStyle: { fontSize: 11, fontWeight: 600, fill: '#18324A' },
    labelBgStyle: { fill: 'white', fillOpacity: 0.92 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  };
}

function analyzeStatus(objects: ProductionObject[], flows: ProductionFlow[]): Map<string, 'ok' | 'warning' | 'bottleneck'> {
  const incoming = new Map<string, number>();
  for (const f of flows) {
    if (!f.target_object_id) continue;
    incoming.set(f.target_object_id, (incoming.get(f.target_object_id) ?? 0) + (f.volume ?? 0));
  }
  const out = new Map<string, 'ok' | 'warning' | 'bottleneck'>();
  for (const o of objects) {
    const cap = o.data?.capacity;
    const inc = incoming.get(o.id) ?? 0;
    if (!cap || inc === 0) continue;
    const load = inc / cap;
    out.set(o.id, load > 1 ? 'bottleneck' : load >= 0.8 ? 'warning' : 'ok');
  }
  return out;
}

function FactoryCanvasInner({
  factory, objects, flows, onFactoryChange, onObjectsChange, onFlowsChange,
}: Props) {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProductionObject | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<ProductionFlow | null>(null);
  const [playing, setPlaying] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimers = useRef<Map<string, any>>(new Map());
  const rf = useReactFlow();

  // resolve blueprint signed URL
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

  const autoStatus = useMemo(() => analyzeStatus(objects, flows), [objects, flows]);

  // Nodes: blueprint (background) + all objects
  const nodes: Node[] = useMemo(() => {
    const list: Node[] = [];
    if (bgUrl) {
      list.push({
        id: `__bp__${factory.id}`,
        type: 'blueprint',
        position: { x: factory.blueprint_x, y: factory.blueprint_y },
        data: { url: bgUrl, opacity: factory.blueprint_opacity, locked: factory.blueprint_locked },
        width: factory.blueprint_width || 1600,
        height: factory.blueprint_height || 1000,
        draggable: !factory.blueprint_locked,
        selectable: !factory.blueprint_locked,
        zIndex: -10,
      } as any);
    }
    for (const o of objects) {
      list.push({
        id: o.id,
        type: 'productionGroup',
        position: { x: o.x, y: o.y },
        data: {
          ...o,
          // auto-status overrides user status when we know incoming volume
          data: { ...(o.data || {}), status: autoStatus.get(o.id) ?? o.data?.status },
        } as unknown as Record<string, unknown>,
        width: o.width,
        height: o.height,
        draggable: !o.locked,
        selectable: true,
        zIndex: 1,
      });
    }
    return list;
  }, [objects, bgUrl, factory, autoStatus]);

  const edges: Edge[] = useMemo(
    () =>
      flows
        .filter((f) => f.source_object_id && f.target_object_id)
        .map((f) => ({
          id: f.id,
          source: f.source_object_id!,
          target: f.target_object_id!,
          type: f.routing || 'smoothstep',
          data: f as unknown as Record<string, unknown>,
          ...edgeStyle(f, playing),
        })),
    [flows, playing]
  );

  // ---- persistence helpers ----
  const scheduleSave = (id: string, patch: Partial<ProductionObject>) => {
    const timers = saveTimers.current;
    if (timers.get(id)) clearTimeout(timers.get(id));
    const t = setTimeout(async () => {
      await supabase.from('production_objects').update(patch as any).eq('id', id);
      timers.delete(id);
    }, 400);
    timers.set(id, t);
  };
  const saveBlueprintTransform = (patch: Partial<ProductionFactory>) => {
    const timers = saveTimers.current;
    const key = '__bp__';
    if (timers.get(key)) clearTimeout(timers.get(key));
    const t = setTimeout(async () => {
      await supabase.from('production_factories').update(patch as any).eq('id', factory.id);
      timers.delete(key);
    }, 400);
    timers.set(key, t);
  };

  const onNodesChange = (changes: NodeChange[]) => {
    // track selection
    const selChange = changes.filter((c) => c.type === 'select') as any[];
    if (selChange.length) {
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);
        for (const c of selChange) c.selected ? next.add(c.id) : next.delete(c.id);
        return Array.from(next);
      });
    }

    const next = applyNodeChanges(changes, nodes);

    // Blueprint updates
    const bp = next.find((n) => n.id === `__bp__${factory.id}`);
    if (bp) {
      const nx = bp.position?.x ?? factory.blueprint_x;
      const ny = bp.position?.y ?? factory.blueprint_y;
      const nw = (bp as any).width ?? factory.blueprint_width;
      const nh = (bp as any).height ?? factory.blueprint_height;
      if (nx !== factory.blueprint_x || ny !== factory.blueprint_y || nw !== factory.blueprint_width || nh !== factory.blueprint_height) {
        const patch = { blueprint_x: nx, blueprint_y: ny, blueprint_width: nw, blueprint_height: nh };
        onFactoryChange({ ...factory, ...patch });
        saveBlueprintTransform(patch);
      }
    }

    // Object updates
    const updated = objects.map((o) => {
      const n = next.find((nn) => nn.id === o.id);
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
    if (!c.source || !c.target || c.source === c.target) return;
    if (c.source.startsWith('__bp__') || c.target.startsWith('__bp__')) return;
    const src = objects.find((o) => o.id === c.source);
    const color = src?.color || FLOW_COLORS.material;
    const { data } = await supabase
      .from('production_flows')
      .insert({
        project_id: factory.project_id,
        source_object_id: c.source,
        target_object_id: c.target,
        source_factory_id: factory.id,
        target_factory_id: factory.id,
        color,
        flow_type: 'material',
        routing: 'smoothstep',
      })
      .select()
      .single();
    if (data) onFlowsChange([...flows, data as any]);
  };

  const addGroup = async () => {
    const vp = rf.getViewport();
    // drop near current viewport centre
    const cx = -vp.x / vp.zoom + window.innerWidth / (2 * vp.zoom);
    const cy = -vp.y / vp.zoom + window.innerHeight / (2 * vp.zoom);
    const { data } = await supabase
      .from('production_objects')
      .insert({
        factory_id: factory.id,
        type: 'production_group',
        name: 'Ny produktionsgrupp',
        icon: 'layers',
        color: '#1E4C7A',
        shape: 'rounded',
        x: Math.round(cx - 80),
        y: Math.round(cy - 40),
        width: 160,
        height: 80,
        data: { group_type: 'other' },
      })
      .select()
      .single();
    if (data) onObjectsChange([...objects, data as any]);
  };

  const uploadBlueprint = async (file: File) => {
    if (file.type === 'application/pdf') {
      toast.error('PDF stöds inte ännu — konvertera till PNG/JPG först.');
      return;
    }
    const path = `${factory.project_id}/${factory.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('production-blueprints').upload(path, file, { upsert: true });
    if (error) { toast.error('Kunde inte ladda upp: ' + error.message); return; }
    // reset transform so ritningen syns i vyn
    const patch = { blueprint_url: path, blueprint_x: -800, blueprint_y: -500, blueprint_width: 1600, blueprint_height: 1000, blueprint_locked: false };
    await supabase.from('production_factories').update(patch as any).eq('id', factory.id);
    onFactoryChange({ ...factory, ...patch });
    toast.success('Ritning uppladdad');
    setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 100);
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

  // Copy / Paste / Delete keyboard
  const clipboardRef = useRef<ProductionObject[]>([]);
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (meta && e.key.toLowerCase() === 'c') {
        clipboardRef.current = objects.filter((o) => selectedNodeIds.includes(o.id));
      } else if (meta && e.key.toLowerCase() === 'v') {
        const toPaste = clipboardRef.current;
        if (!toPaste.length) return;
        const inserts = toPaste.map((o) => ({
          factory_id: factory.id,
          type: o.type, name: o.name + ' (kopia)', icon: o.icon, color: o.color,
          shape: o.shape, border_color: o.border_color, border_width: o.border_width,
          x: o.x + 30, y: o.y + 30, width: o.width, height: o.height,
          rotation: o.rotation, locked: false, data: o.data,
        }));
        const { data } = await supabase.from('production_objects').insert(inserts as any).select();
        if (data) onObjectsChange([...objects, ...(data as any[])]);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length) {
        const ids = selectedNodeIds.filter((id) => !id.startsWith('__bp__'));
        if (!ids.length) return;
        await supabase.from('production_objects').delete().in('id', ids);
        onObjectsChange(objects.filter((o) => !ids.includes(o.id)));
        setSelectedNodeIds([]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [objects, selectedNodeIds, factory.id, onObjectsChange]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => {
          if (n.id.startsWith('__bp__')) { setSelected(null); return; }
          setSelected((n.data as any));
        }}
        onEdgeClick={(_, e) => setSelectedFlow((e.data as any))}
        onPaneClick={() => { setSelected(null); setSelectedFlow(null); }}
        snapToGrid={snapEnabled}
        snapGrid={[10, 10]}
        fitView
        minZoom={0.05}
        maxZoom={4}
        zoomOnScroll
        panOnScroll={false}
        panOnDrag={[1, 2]}
        selectionOnDrag
        panActivationKeyCode="Space"
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: '#eef2f5' }}
      >
        <Background gap={20} size={1} color="#cbd5e1" variant={BackgroundVariant.Dots} />
        <Controls position="bottom-left" />
        <MiniMap
          pannable zoomable
          nodeColor={(n: any) => (n.data as any)?.color || '#1E4C7A'}
          style={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }}
        />

        <Panel position="top-left" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-white p-2 shadow-sm">
            <Button size="sm" onClick={addGroup} className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" /> Produktionsgrupp
            </Button>
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => fileRef.current?.click()}>
              {factory.blueprint_url ? <ImageIcon className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              {factory.blueprint_url ? 'Byt ritning' : 'Ladda upp ritning'}
            </Button>
            {factory.blueprint_url && (
              <>
                <Button
                  size="sm" variant="ghost" className="h-8 gap-1"
                  onClick={async () => {
                    const patch = { blueprint_locked: !factory.blueprint_locked };
                    await supabase.from('production_factories').update(patch as any).eq('id', factory.id);
                    onFactoryChange({ ...factory, ...patch });
                  }}
                >
                  {factory.blueprint_locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  {factory.blueprint_locked ? 'Lås upp' : 'Lås'} ritning
                </Button>
                <div className="flex items-center gap-1.5 px-2 text-xs text-slate-600">
                  <span>Opacitet</span>
                  <div className="w-20">
                    <Slider
                      min={10} max={100} step={5}
                      value={[Math.round((factory.blueprint_opacity ?? 0.7) * 100)]}
                      onValueChange={([v]) => {
                        const patch = { blueprint_opacity: v / 100 };
                        onFactoryChange({ ...factory, ...patch });
                        saveBlueprintTransform(patch);
                      }}
                    />
                  </div>
                </div>
              </>
            )}
            <input
              ref={fileRef} type="file" className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadBlueprint(e.target.files[0])}
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border bg-white p-2 shadow-sm">
            <Button
              size="sm"
              variant={playing ? 'default' : 'outline'}
              className="h-8 gap-1"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Pausa' : 'Play mode'}
            </Button>
            <Button
              size="sm" variant="ghost" className="h-8 gap-1"
              onClick={() => { setPlaying(false); setTimeout(() => setPlaying(true), 50); }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Starta om
            </Button>
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={(e) => setSnapEnabled(e.target.checked)}
              />
              Snap-to-grid
            </label>
          </div>
        </Panel>
      </ReactFlow>

      {/* Object side panel */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[360px] sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: selected.color }} />
                  Produktionsgrupp
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 pb-6">
                <div>
                  <Label>Namn</Label>
                  <Input value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
                </div>
                <div>
                  <Label>Typ</Label>
                  <Select
                    value={selected.data?.group_type || 'other'}
                    onValueChange={(v) => updateSelectedData({ group_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Form</Label>
                  <div className="mt-1 grid grid-cols-4 gap-1">
                    {(['rect','rounded','pill','circle'] as GroupShape[]).map((s) => (
                      <Button
                        key={s} type="button"
                        variant={selected.shape === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateSelected({ shape: s })}
                        className="h-9"
                      >
                        {s === 'rect' && <Square className="h-4 w-4" />}
                        {s === 'rounded' && <RectangleHorizontal className="h-4 w-4" />}
                        {s === 'pill' && <span className="h-3 w-6 rounded-full bg-current opacity-70" />}
                        {s === 'circle' && <Circle className="h-4 w-4" />}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Färg</Label>
                    <Input type="color" value={selected.color} onChange={(e) => updateSelected({ color: e.target.value })} className="h-10 p-1" />
                  </div>
                  <div>
                    <Label>Kantfärg</Label>
                    <Input type="color" value={selected.border_color || selected.color} onChange={(e) => updateSelected({ border_color: e.target.value })} className="h-10 p-1" />
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
                  <Label>Status (manuell)</Label>
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
                  <p className="mt-1 text-[11px] text-slate-500">Auto-flaskhals aktiveras om inkommande volym &gt; kapacitet.</p>
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
        <SheetContent className="w-[360px] sm:max-w-md">
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
                    <Select value={selectedFlow.flow_type} onValueChange={(v) => updateSelectedFlow({ flow_type: v as any, color: FLOW_COLORS[v as keyof typeof FLOW_COLORS] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="info">Information</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Routing</Label>
                    <Select value={selectedFlow.routing || 'smoothstep'} onValueChange={(v) => updateSelectedFlow({ routing: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smoothstep">Rundad</SelectItem>
                        <SelectItem value="step">Ortogonal</SelectItem>
                        <SelectItem value="bezier">Bezier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Färg</Label>
                  <Input type="color" value={selectedFlow.color} onChange={(e) => updateSelectedFlow({ color: e.target.value })} className="h-10 p-1" />
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
