import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowLeft, Factory as FactoryIcon, Network, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useProductionProjects, useProductionProject } from './useProductionData';
import { FactoryCanvas } from './FactoryCanvas';
import { OverviewCanvas } from './OverviewCanvas';
import { toPng } from 'html-to-image';

export function ProductionModule() {
  const { projects, refresh } = useProductionProjects();
  const { user } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const createProject = async () => {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from('production_projects')
      .insert({ name: newName.trim(), created_by: user?.id })
      .select()
      .single();
    setNewOpen(false); setNewName('');
    await refresh();
    if (data) setActiveProjectId((data as any).id);
  };

  if (!activeProject) {
    return (
      <div className="min-h-full bg-[#f0f4f2] p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
                <FactoryIcon className="h-4 w-4" /> Produktionsflöden
              </div>
              <h1 className="text-3xl font-bold text-[#18323A]">Projekt</h1>
              <p className="mt-1 text-sm text-slate-600">Visualisera och optimera dina produktionsflöden.</p>
            </div>
            <Button onClick={() => setNewOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Nytt projekt
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
              <FactoryIcon className="h-10 w-10 text-slate-300" />
              <p className="text-slate-600">Inga produktionsprojekt än.</p>
              <Button onClick={() => setNewOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Skapa ditt första projekt
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className="group cursor-pointer overflow-hidden border-t-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderTopColor: '#1C7F72' }}
                >
                  <h3 className="mb-1 font-semibold text-[#18323A] group-hover:text-primary">{p.name}</h3>
                  {p.description && <p className="line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-400">
                    Uppdaterat {new Date(p.updated_at).toLocaleDateString('sv-SE')}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nytt produktionsprojekt</DialogTitle></DialogHeader>
            <Input
              placeholder="Projektnamn"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOpen(false)}>Avbryt</Button>
              <Button onClick={createProject}>Skapa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return <ProjectWorkspace projectId={activeProject.id} projectName={activeProject.name} onBack={() => setActiveProjectId(null)} onDeleted={async () => { setActiveProjectId(null); await refresh(); }} />;
}

function ProjectWorkspace({
  projectId, projectName, onBack, onDeleted,
}: { projectId: string; projectName: string; onBack: () => void; onDeleted: () => void }) {
  const {
    factories, objects, flows, refresh,
    setFactories, setObjects, setFlows,
  } = useProductionProject(projectId);
  const [view, setView] = useState<'overview' | string>('overview');
  const [newFactoryOpen, setNewFactoryOpen] = useState(false);
  const [newFactoryName, setNewFactoryName] = useState('');

  const activeFactory = factories.find((f) => f.id === view);
  const factoryObjects = useMemo(
    () => (activeFactory ? objects.filter((o) => o.factory_id === activeFactory.id) : []),
    [objects, activeFactory]
  );

  const addFactory = async () => {
    if (!newFactoryName.trim()) return;
    const maxX = Math.max(0, ...factories.map((f) => f.overview_x));
    const { data } = await supabase
      .from('production_factories')
      .insert({
        project_id: projectId,
        name: newFactoryName.trim(),
        overview_x: maxX + 320,
        overview_y: 80,
        order_index: factories.length,
      } as any)
      .select().single();
    setNewFactoryOpen(false); setNewFactoryName('');
    if (data) {
      setFactories([...factories, data as any]);
      setView((data as any).id);
    }
  };

  const deleteProject = async () => {
    if (!confirm('Vill du ta bort projektet? Detta går inte att ångra.')) return;
    await supabase.from('production_projects').delete().eq('id', projectId);
    toast.success('Projekt borttaget');
    onDeleted();
  };

  const exportPng = async () => {
    const el = document.querySelector('.react-flow') as HTMLElement | null;
    if (!el) return;
    try {
      const url = await toPng(el, { backgroundColor: '#f0f4f2', cacheBust: true, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}-${view === 'overview' ? 'oversikt' : activeFactory?.name}.png`;
      a.click();
    } catch (e: any) {
      toast.error('Kunde inte exportera: ' + e.message);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#f0f4f2]">
      <header className="flex items-center justify-between gap-4 border-b bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Projekt</Button>
          <div className="h-6 w-px bg-slate-200" />
          <FactoryIcon className="h-4 w-4 text-primary" />
          <span className="font-semibold text-[#18323A]">{projectName}</span>
        </div>

        <Tabs value={view} onValueChange={setView}>
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="gap-1.5"><Network className="h-3.5 w-3.5" /> Översikt</TabsTrigger>
            {factories.map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                {f.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewFactoryOpen(true)} className="gap-1"><Plus className="h-3.5 w-3.5" /> Fabrik</Button>
          <Button variant="outline" size="sm" onClick={exportPng} className="gap-1"><Download className="h-3.5 w-3.5" /> PNG</Button>
          <Button variant="ghost" size="sm" onClick={deleteProject} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </header>

      <div className="relative flex-1">
        {view === 'overview' ? (
          <OverviewCanvas
            factories={factories}
            objects={objects}
            flows={flows}
            onOpenFactory={(id) => setView(id)}
            onFactoriesChange={setFactories}
            onFlowsChange={setFlows}
          />
        ) : activeFactory ? (
          <FactoryCanvas
            key={activeFactory.id}
            factory={activeFactory}
            objects={factoryObjects}
            flows={flows.filter((f) => f.source_factory_id === activeFactory.id || f.target_factory_id === activeFactory.id)}
            onFactoryChange={(f) => setFactories(factories.map((x) => x.id === f.id ? f : x))}
            onObjectsChange={(objs) => {
              const others = objects.filter((o) => o.factory_id !== activeFactory.id);
              setObjects([...others, ...objs]);
            }}
            onFlowsChange={(fs) => {
              const factoryIds = new Set([activeFactory.id]);
              const others = flows.filter((f) => !(factoryIds.has(f.source_factory_id || '') || factoryIds.has(f.target_factory_id || '')));
              // Simpler: replace all flows that touch this factory with fs; keep the rest untouched
              const untouched = flows.filter((f) => f.source_factory_id !== activeFactory.id && f.target_factory_id !== activeFactory.id);
              setFlows([...untouched, ...fs]);
            }}
          />
        ) : null}
      </div>

      <Dialog open={newFactoryOpen} onOpenChange={setNewFactoryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ny fabrik</DialogTitle></DialogHeader>
          <Input
            placeholder="Namn på fabrik"
            value={newFactoryName}
            onChange={(e) => setNewFactoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFactory()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFactoryOpen(false)}>Avbryt</Button>
            <Button onClick={addFactory}>Skapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
