import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Trash2, Archive, RotateCcw, User, ShoppingBag, FileText, Pencil, FolderOpen, FolderArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Project } from '@/data/projectData';
import { AddProjectDialog } from './dialogs/AddProjectDialog';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 }
};

interface ProjectRowProps {
  project: Project;
  onDeleteProject: (projectId: string) => void;
  onArchiveProject?: (projectId: string) => void;
  onRestoreProject?: (projectId: string) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  isArchived?: boolean;
}

function ProjectRow({ project, onDeleteProject, onArchiveProject, onRestoreProject, onUpdateProject, isArchived }: ProjectRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    customer: project.customer || '',
    projectManager: project.projectManager || '',
    salesPerson: project.salesPerson || '',
    product: project.product || '',
    notes: project.notes || ''
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
      notes: project.notes || ''
    });
    setIsEditing(true);
    if (!isExpanded) setIsExpanded(true);
  };

  return (
    <>
      <motion.tr
        variants={itemVariants}
        className={cn(
          "group cursor-pointer transition-colors",
          isArchived ? "opacity-60" : "hover:bg-primary/[0.04]"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="py-1.5 px-2 w-[40px] border-0">
          <span className="text-primary/70">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        </TableCell>
        <TableCell className="py-1.5 px-2 border-0">
          <span className="font-semibold text-sm truncate">
            {project.code} – {project.name}
          </span>
        </TableCell>
        <TableCell className="py-1.5 px-2 border-0">
          <span className="text-xs text-muted-foreground truncate">{project.customer || '–'}</span>
        </TableCell>
        <TableCell className="py-1.5 px-2 border-0">
          <span className="text-xs text-muted-foreground truncate">{project.product || '–'}</span>
        </TableCell>
        <TableCell className="py-1.5 px-2 border-0">
          <span className="text-xs text-muted-foreground truncate">{project.projectManager || '–'}</span>
        </TableCell>
        <TableCell className="py-1.5 px-2 border-0">
          <span className="text-xs text-muted-foreground truncate">{project.salesPerson || '–'}</span>
        </TableCell>
        <TableCell className="py-1.5 px-2 border-0 text-right">
          <div className="flex items-center justify-end gap-0.5">
            {isArchived && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-1">
                <Archive className="h-2.5 w-2.5" />
                Avslutat
              </span>
            )}
            {!isArchived && (
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" onClick={handleStartEdit} title="Redigera">
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {isArchived ? (
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" onClick={handleRestore} title="Återställ">
                <RotateCcw className="h-3 w-3" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" onClick={handleArchive} title="Arkivera">
                <Archive className="h-3 w-3" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={handleDeleteProject} title="Ta bort">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </motion.tr>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TableCell colSpan={7} className="p-0 border-0">
              <div className="border-t border-border/30 bg-muted/30 px-10 py-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Kund</label>
                        <Input className="h-8 text-sm" value={editData.customer} onChange={(e) => setEditData((prev) => ({ ...prev, customer: e.target.value }))} placeholder="Kundnamn" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Projektledare</label>
                        <Input className="h-8 text-sm" value={editData.projectManager} onChange={(e) => setEditData((prev) => ({ ...prev, projectManager: e.target.value }))} placeholder="Namn" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Ansvarig säljare</label>
                        <Input className="h-8 text-sm" value={editData.salesPerson} onChange={(e) => setEditData((prev) => ({ ...prev, salesPerson: e.target.value }))} placeholder="Namn" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Såld produkt</label>
                        <Input className="h-8 text-sm" value={editData.product} onChange={(e) => setEditData((prev) => ({ ...prev, product: e.target.value }))} placeholder="t.ex. Teleskopläktare" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Noteringar</label>
                      <Textarea className="text-sm" value={editData.notes} onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Övrig information..." rows={2} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)}>Avbryt</Button>
                      <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Spara</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Kund', value: project.customer, icon: User },
                        { label: 'Projektledare', value: project.projectManager, icon: User },
                        { label: 'Ansvarig säljare', value: project.salesPerson, icon: User },
                        { label: 'Såld produkt', value: project.product, icon: ShoppingBag },
                      ].map((field) => (
                        <div key={field.label} className="flex items-center gap-1.5 text-xs">
                          <field.icon className="h-3 w-3 text-primary/60 shrink-0" />
                          <span className="text-muted-foreground">{field.label}:</span>
                          <span className="font-medium truncate">{field.value || '–'}</span>
                        </div>
                      ))}
                    </div>
                    {project.notes && (
                      <div className="flex items-start gap-1.5 text-xs border-t border-border/30 pt-2">
                        <FileText className="h-3 w-3 text-primary/60 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Not:</span>
                        <span className="text-foreground">{project.notes}</span>
                      </div>
                    )}
                    {!project.customer && !project.projectManager && !project.salesPerson && !project.product && !project.notes && (
                      <p className="text-xs text-muted-foreground">Ingen information tillagd. Klicka på pennikonen för att redigera.</p>
                    )}
                  </div>
                )}
              </div>
            </TableCell>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

export function ProjectsView() {
  const { projects, deleteProject, updateProject } = useProjectDataContext();

  const activeProjects = projects.filter((p) => p.status !== 'Avslutat');
  const archivedProjects = projects.filter((p) => p.status === 'Avslutat');

  const handleArchive = async (projectId: string) => {
    await updateProject(projectId, { status: 'Avslutat' } as any);
  };

  const handleRestore = async (projectId: string) => {
    await updateProject(projectId, { status: 'Pågår' } as any);
  };

  const renderTable = (projectList: Project[], isArchived: boolean) => (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-card/80 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[40px] py-1.5 px-2"></TableHead>
            <TableHead className="font-semibold text-xs py-1.5 px-2">Projekt</TableHead>
            <TableHead className="font-semibold text-xs py-1.5 px-2">Kund</TableHead>
            <TableHead className="font-semibold text-xs py-1.5 px-2">Produkt</TableHead>
            <TableHead className="font-semibold text-xs py-1.5 px-2">Projektledare</TableHead>
            <TableHead className="font-semibold text-xs py-1.5 px-2">Ansvarig säljare</TableHead>
            <TableHead className="font-semibold text-xs py-1.5 px-2 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {projectList.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onDeleteProject={deleteProject}
                onArchiveProject={isArchived ? undefined : handleArchive}
                onRestoreProject={isArchived ? handleRestore : undefined}
                onUpdateProject={updateProject}
                isArchived={isArchived}
              />
            ))}
          </AnimatePresence>
          {projectList.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm border-0">
                {isArchived ? 'Inga arkiverade projekt ännu.' : 'Inga aktiva projekt. Klicka på "Nytt projekt" för att börja.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projekt</h1>
          <p className="text-muted-foreground text-sm">Hantera och organisera dina projekt</p>
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

        <TabsContent value="active" className="mt-3">
          {renderTable(activeProjects, false)}
        </TabsContent>

        <TabsContent value="archived" className="mt-3">
          {renderTable(archivedProjects, true)}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
