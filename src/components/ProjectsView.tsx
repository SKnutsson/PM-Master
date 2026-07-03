import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Trash2, Archive, RotateCcw, User, ShoppingBag, FileText, Pencil, FolderOpen, FolderArchive, MapPin, Loader2, Briefcase, FileDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Project } from '@/data/projectData';
import { AddProjectDialog } from './dialogs/AddProjectDialog';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { ProjectTasksList } from './ProjectTasksList';
import { geocodeAddress } from '@/lib/geocode';
import { generateProjectReport } from '@/lib/projectReport';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.025 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 }
};

interface ProjectCardProps {
  project: Project;
  onDeleteProject: (projectId: string) => void;
  onArchiveProject?: (projectId: string) => void;
  onRestoreProject?: (projectId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  isArchived?: boolean;
  isAdmin: boolean;
}

function MetaCell({ icon: Icon, value }: { icon: any; value?: string }) {
  return (
    <div className="hidden lg:flex items-center gap-1.5 text-xs min-w-0">
      <Icon className="h-3 w-3 text-primary/70 shrink-0" />
      <span className="font-medium text-foreground truncate">{value || <span className="text-muted-foreground/50 font-normal">–</span>}</span>
    </div>
  );
}

function ProjectCard({ project, onDeleteProject, onArchiveProject, onRestoreProject, onUpdateProject, isArchived, isAdmin }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [editData, setEditData] = useState({
    customer: project.customer || '',
    projectManager: project.projectManager || '',
    salesPerson: project.salesPerson || '',
    product: project.product || '',
    address: project.address || '',
    notes: project.notes || ''
  });

  const handleOpenDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmText('');
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    onDeleteProject(project.id);
    setDeleteOpen(false);
    toast.success(`Projekt ${project.code} borttaget`);
  };

  const handleGenerateReport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGeneratingReport(true);
    try {
      await generateProjectReport(project);
      toast.success('Rapport genererad');
    } catch (err: any) {
      toast.error('Kunde inte skapa rapport: ' + (err?.message || 'okänt fel'));
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Vill du avsluta och arkivera projektet "${project.code} - ${project.name}"?`)) {
      onArchiveProject?.(project.id);
    }
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestoreProject?.(project.id);
  };

  const handleSave = async () => {
    setSavingEdit(true);
    const updates: Partial<Project> = { ...editData };
    if ((editData.address || '').trim() !== (project.address || '').trim()) {
      if (editData.address.trim()) {
        const geo = await geocodeAddress(editData.address);
        if (geo) {
          updates.latitude = geo.lat;
          updates.longitude = geo.lon;
        } else {
          updates.latitude = null;
          updates.longitude = null;
          toast.warning('Kunde inte hitta koordinater för adressen.');
        }
      } else {
        updates.latitude = null;
        updates.longitude = null;
      }
    }
    await onUpdateProject(project.id, updates);
    setSavingEdit(false);
    setIsEditing(false);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      customer: project.customer || '',
      projectManager: project.projectManager || '',
      salesPerson: project.salesPerson || '',
      product: project.product || '',
      address: project.address || '',
      notes: project.notes || ''
    });
    setIsEditing(true);
    if (!isExpanded) setIsExpanded(true);
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className={cn(
        "group transition-all border-border/60 hover:border-primary/30 hover:shadow-sm overflow-hidden",
        isArchived && "opacity-75",
        isExpanded && "border-primary/40 shadow-sm"
      )}>
        <CardHeader
          className="py-3 px-4 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto]">
            {/* Title */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-primary/70 shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <span className="text-xs font-mono text-muted-foreground tracking-wide shrink-0">
                {project.code}
              </span>
              <span className="font-semibold text-sm truncate">
                {project.name}
              </span>
              {isArchived && (
                <Badge variant="secondary" className="ml-1 text-[10px] py-0 h-4 shrink-0">
                  <Archive className="h-2.5 w-2.5 mr-1" />Avslutat
                </Badge>
              )}
            </div>

            {/* Aligned meta columns */}
            <MetaCell icon={Briefcase} value={project.customer} />
            <MetaCell icon={ShoppingBag} value={project.product} />
            <MetaCell icon={User} value={project.projectManager} />
            <MetaCell icon={User} value={project.salesPerson} />

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0 justify-end">
              {!isArchived && (
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" onClick={handleStartEdit} title="Redigera">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {isArchived ? (
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" onClick={handleRestore} title="Återställ">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" onClick={handleArchive} title="Arkivera">
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
              {isAdmin && (
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" onClick={handleGenerateReport} disabled={generatingReport} title="Ladda ner PDF-rapport">
                  {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                </Button>
              )}
              {isAdmin && (
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={handleOpenDelete} title="Ta bort projekt (permanent)">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* mobile/tablet inline meta */}
          <div className="lg:hidden mt-2 flex items-center gap-3 flex-wrap pl-6">
            {project.customer && <span className="text-[11px] text-muted-foreground"><span className="text-muted-foreground/70">Kund:</span> <span className="text-foreground">{project.customer}</span></span>}
            {project.product && <span className="text-[11px] text-muted-foreground"><span className="text-muted-foreground/70">Produkt:</span> <span className="text-foreground">{project.product}</span></span>}
            {project.projectManager && <span className="text-[11px] text-muted-foreground"><span className="text-muted-foreground/70">PL:</span> <span className="text-foreground">{project.projectManager}</span></span>}
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="border-t border-border/40 bg-muted/20 px-4 pt-3 pb-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Kund</label>
                        <Input className="h-8 text-sm" value={editData.customer} onChange={(e) => setEditData((p) => ({ ...p, customer: e.target.value }))} placeholder="Kundnamn" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Projektledare</label>
                        <Input className="h-8 text-sm" value={editData.projectManager} onChange={(e) => setEditData((p) => ({ ...p, projectManager: e.target.value }))} placeholder="Namn" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Ansvarig säljare</label>
                        <Input className="h-8 text-sm" value={editData.salesPerson} onChange={(e) => setEditData((p) => ({ ...p, salesPerson: e.target.value }))} placeholder="Namn" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Såld produkt</label>
                        <Input className="h-8 text-sm" value={editData.product} onChange={(e) => setEditData((p) => ({ ...p, product: e.target.value }))} placeholder="t.ex. Teleskopläktare" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Adress (för karta)</label>
                      <Input className="h-8 text-sm" value={editData.address} onChange={(e) => setEditData((p) => ({ ...p, address: e.target.value }))} placeholder="t.ex. Storgatan 1, Stockholm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Noteringar</label>
                      <Textarea className="text-sm" value={editData.notes} onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))} placeholder="Övrig information..." rows={2} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)} disabled={savingEdit}>Avbryt</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={savingEdit}>
                        {savingEdit && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        Spara
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                      {[
                        { label: 'Kund', value: project.customer, icon: Briefcase },
                        { label: 'Projektledare', value: project.projectManager, icon: User },
                        { label: 'Ansvarig säljare', value: project.salesPerson, icon: User },
                        { label: 'Såld produkt', value: project.product, icon: ShoppingBag },
                      ].map((f) => (
                        <div key={f.label} className="flex items-start gap-1.5 text-xs">
                          <f.icon className="h-3 w-3 text-primary/60 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-muted-foreground/80 text-[10px] uppercase tracking-wide">{f.label}</div>
                            <div className="font-medium truncate">{f.value || '–'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {project.address && (
                      <div className="flex items-center gap-1.5 text-xs border-t border-border/30 pt-2">
                        <MapPin className="h-3 w-3 text-primary/60 shrink-0" />
                        <span className="text-muted-foreground">Adress:</span>
                        <span className="font-medium truncate">{project.address}</span>
                      </div>
                    )}
                    {project.notes && (
                      <div className="flex items-start gap-1.5 text-xs border-t border-border/30 pt-2">
                        <FileText className="h-3 w-3 text-primary/60 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Not:</span>
                        <span className="text-foreground whitespace-pre-wrap break-words">{project.notes}</span>
                      </div>
                    )}
                    <div className="border-t border-border/30 pt-2">
                      <ProjectTasksList projectId={project.id} />
                    </div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Radera projekt permanent?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Du är på väg att radera <strong>{project.code} – {project.name}</strong> och
                  <strong> all tillhörande data</strong> (aktiviteter, resursplan, dokumentation, ÄTA, avvikelser, KPI).
                </p>
                <p className="font-semibold text-destructive">Detta går inte att ångra.</p>
                <p className="text-sm">Skriv projektets nummer <code className="rounded bg-muted px-1.5 py-0.5">{project.code}</code> för att bekräfta:</p>
                <Input
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={project.code}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText.trim() !== project.code}
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Radera permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

export function ProjectsView() {
  const { projects, deleteProject, updateProject } = useProjectDataContext();
  const { isAdmin } = usePermissions();

  const activeProjects = projects.filter((p) => p.status !== 'Avslutat');
  const archivedProjects = projects.filter((p) => p.status === 'Avslutat');

  const handleArchive = async (projectId: string) => {
    await updateProject(projectId, { status: 'Avslutat' } as any);
  };

  const handleRestore = async (projectId: string) => {
    await updateProject(projectId, { status: 'Pågår' } as any);
  };

  const renderList = (projectList: Project[], isArchived: boolean) => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {projectList.length > 0 && (
        <div className="hidden lg:grid items-center gap-3 px-4 py-1.5 grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto] text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
          <div className="pl-6">Projekt</div>
          <div>Kund</div>
          <div>Produkt</div>
          <div>Projektledare</div>
          <div>Säljare</div>
          <div className="w-[84px]" />
        </div>
      )}
      <AnimatePresence>
        {projectList.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDeleteProject={deleteProject}
            onArchiveProject={isArchived ? undefined : handleArchive}
            onRestoreProject={isArchived ? handleRestore : undefined}
            onUpdateProject={updateProject}
            isArchived={isArchived}
            isAdmin={isAdmin}
          />
        ))}
      </AnimatePresence>
      {projectList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {isArchived ? 'Inga arkiverade projekt ännu.' : 'Inga aktiva projekt. Klicka på "Nytt projekt" för att börja.'}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projekt</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeProjects.length} aktiva · {archivedProjects.length} arkiverade
          </p>
        </div>
        <AddProjectDialog />
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Aktiva ({activeProjects.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            <FolderArchive className="h-3.5 w-3.5" />
            Arkiverade ({archivedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {renderList(activeProjects, false)}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {renderList(archivedProjects, true)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
