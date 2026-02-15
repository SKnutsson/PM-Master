import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Trash2, Archive, RotateCcw, User, ShoppingBag, FileText, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project } from '@/data/projectData';
import { AddProjectDialog } from './dialogs/AddProjectDialog';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

interface ProjectCardProps {
  project: Project;
  onDeleteProject: (projectId: string) => void;
  onArchiveProject?: (projectId: string) => void;
  onRestoreProject?: (projectId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  isArchived?: boolean;
}

function ProjectCard({ project, onDeleteProject, onArchiveProject, onRestoreProject, onUpdateProject, isArchived }: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    customer: project.customer || '',
    projectManager: project.projectManager || '',
    salesPerson: project.salesPerson || '',
    product: project.product || '',
    notes: project.notes || '',
  });

  const handleDeleteProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Är du säker på att du vill ta bort projektet "${project.code} - ${project.name}"?`)) {
      onDeleteProject(project.id);
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
    await onUpdateProject(project.id, editData);
    setIsEditing(false);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      customer: project.customer || '',
      projectManager: project.projectManager || '',
      salesPerson: project.salesPerson || '',
      product: project.product || '',
      notes: project.notes || '',
    });
    setIsEditing(true);
    if (!isExpanded) setIsExpanded(true);
  };

  const infoFields = [
    { label: 'Kund', value: project.customer, icon: User },
    { label: 'Projektledare', value: project.projectManager, icon: User },
    { label: 'Ansvarig säljare', value: project.salesPerson, icon: User },
    { label: 'Såld produkt', value: project.product, icon: ShoppingBag },
  ];

  const hasInfo = infoFields.some(f => f.value) || project.notes;

  return (
    <motion.div variants={itemVariants}>
      <Card className={cn(
        "border-border/50 overflow-hidden transition-all hover:border-primary/30",
        isArchived ? "bg-card/50 opacity-80" : "bg-card/80"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 text-left"
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors',
                isArchived
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/20 text-primary'
              )}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {project.code} - {project.name}
                </CardTitle>
                <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                  {project.customer && <span>Kund: {project.customer}</span>}
                  {project.product && <span>Produkt: {project.product}</span>}
                  {isArchived && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Archive className="h-3.5 w-3.5" />
                      Avslutat
                    </span>
                  )}
                </div>
              </div>
            </button>
            
            <div className="flex items-center gap-1">
              {!isArchived && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={handleStartEdit}
                  title="Redigera projektinfo"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {isArchived ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={handleRestore}
                  title="Återställ projekt"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={handleArchive}
                  title="Avsluta och arkivera"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleDeleteProject}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="border-t border-border/50 pt-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Kund</label>
                        <Input
                          value={editData.customer}
                          onChange={(e) => setEditData(prev => ({ ...prev, customer: e.target.value }))}
                          placeholder="Kundnamn"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Projektledare</label>
                        <Input
                          value={editData.projectManager}
                          onChange={(e) => setEditData(prev => ({ ...prev, projectManager: e.target.value }))}
                          placeholder="Namn"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Ansvarig säljare</label>
                        <Input
                          value={editData.salesPerson}
                          onChange={(e) => setEditData(prev => ({ ...prev, salesPerson: e.target.value }))}
                          placeholder="Namn"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Såld produkt</label>
                        <Input
                          value={editData.product}
                          onChange={(e) => setEditData(prev => ({ ...prev, product: e.target.value }))}
                          placeholder="t.ex. Teleskopläktare"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-muted-foreground">Noteringar</label>
                      <Textarea
                        value={editData.notes}
                        onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Övrig information..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Avbryt</Button>
                      <Button size="sm" onClick={handleSave}>Spara</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {infoFields.map((field) => (
                        <div key={field.label} className="flex items-center gap-2 text-sm">
                          <field.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{field.label}:</span>
                          <span className="font-medium">{field.value || '–'}</span>
                        </div>
                      ))}
                    </div>
                    {project.notes && (
                      <div className="flex items-start gap-2 text-sm border-t border-border/50 pt-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Noteringar: </span>
                          <span>{project.notes}</span>
                        </div>
                      </div>
                    )}
                    {!hasInfo && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        Ingen information tillagd. Klicka på pennikonen för att redigera.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export function ProjectsView() {
  const { projects, deleteProject, updateProject } = useProjectDataContext();

  const activeProjects = projects.filter(p => p.status !== 'Avslutat');
  const archivedProjects = projects.filter(p => p.status === 'Avslutat');

  const handleArchive = async (projectId: string) => {
    await updateProject(projectId, { status: 'Avslutat' } as any);
  };

  const handleRestore = async (projectId: string) => {
    await updateProject(projectId, { status: 'Pågår' } as any);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projekt</h1>
          <p className="text-muted-foreground">Hantera och följ upp alla projekt</p>
        </div>
        <AddProjectDialog />
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Aktiva ({activeProjects.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="mr-1.5 h-4 w-4" />
            Arkiverade ({archivedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleteProject={deleteProject}
              onArchiveProject={handleArchive}
              onUpdateProject={updateProject}
            />
          ))}
          {activeProjects.length === 0 && (
            <Card className="border-border/50 bg-card/80 p-8 text-center">
              <p className="text-muted-foreground">Inga aktiva projekt. Klicka på "Nytt projekt" för att börja.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4 space-y-4">
          {archivedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleteProject={deleteProject}
              onRestoreProject={handleRestore}
              onUpdateProject={updateProject}
              isArchived
            />
          ))}
          {archivedProjects.length === 0 && (
            <Card className="border-border/50 bg-card/80 p-8 text-center">
              <p className="text-muted-foreground">Inga arkiverade projekt ännu.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
