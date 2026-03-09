import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, AlertTriangle, Check, Clock, FileText, Filter, ChevronsDownUp, ChevronsUpDown, Archive } from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfiles, getDisplayName } from '@/hooks/useProfiles';
import { UserAvatar } from '@/components/UserAvatar';
import { UserSelect } from '@/components/UserSelect';

interface DocumentationItem {
  id: string;
  project_id: string;
  document_type: string;
  deadline: string | null;
  status: string;
  submitted_date: string | null;
  submitted_to: string | null;
  responsible: string | null;
  notes: string | null;
  sort_order: number;
}

const DOC_STATUSES = ['Ej påbörjad', 'Pågår', 'Inlämnad'] as const;
const DOC_TYPE_SUGGESTIONS = [
  'Egenkontroll', 'Relationsritning', 'CE-dokumentation', 'Drift & underhåll',
  'Installationsprotokoll', 'Provningsprotokoll', 'Garantihandling', 'Bruksanvisning'
];
const SUBMITTED_TO_SUGGESTIONS = ['Kund', 'Beställare', 'Kommun', 'Konsult', 'Entreprenör'];

type StatusFilter = 'all' | 'Ej påbörjad' | 'Pågående' | 'Inlämnad' | 'overdue';

function getStatusBadge(status: string, deadline: string | null) {
  const isOverdue = deadline && isPast(new Date(deadline)) && !isToday(new Date(deadline)) && status !== 'Inlämnad';
  
  if (isOverdue) {
    return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Försenad</Badge>;
  }
  
  switch (status) {
    case 'Inlämnad':
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1"><Check className="h-3 w-3" />Inlämnad</Badge>;
    case 'Pågående':
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20 text-xs gap-1"><Clock className="h-3 w-3" />Pågående</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Ej påbörjad</Badge>;
  }
}

export function DocumentationPlanView() {
  const { projects } = useProjectDataContext();
  const { toast } = useToast();
  const { profiles } = useProfiles();
  const [items, setItems] = useState<DocumentationItem[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentationItem | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formType, setFormType] = useState('');
  const [formDeadline, setFormDeadline] = useState<Date | undefined>();
  const [formStatus, setFormStatus] = useState<string>('Ej påbörjad');
  const [formSubmittedDate, setFormSubmittedDate] = useState<Date | undefined>();
  const [formSubmittedTo, setFormSubmittedTo] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formResponsible, setFormResponsible] = useState('');

  // Fetch items
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('documentation_items')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      toast({ title: 'Fel', description: 'Kunde inte hämta dokumentation', variant: 'destructive' });
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  const activeProjects = useMemo(() => {
    const active = projects.filter(p => p.status !== 'Avslutat');
    if (!showArchived) return active;
    const archived = projects.filter(p => p.status === 'Avslutat');
    return [...active, ...archived];
  }, [projects, showArchived]);

  const archivedProjectIds = useMemo(() => 
    new Set(projects.filter(p => p.status === 'Avslutat').map(p => p.id)),
    [projects]
  );

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items;
    if (statusFilter === 'overdue') {
      return items.filter(i => i.deadline && isPast(new Date(i.deadline)) && !isToday(new Date(i.deadline)) && i.status !== 'Inlämnad');
    }
    return items.filter(i => i.status === statusFilter);
  }, [items, statusFilter]);

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openAddDialog = (projectId: string) => {
    setSelectedProjectId(projectId);
    setEditingItem(null);
    setFormType('');
    setFormDeadline(undefined);
    setFormStatus('Ej påbörjad');
    setFormSubmittedDate(undefined);
    setFormSubmittedTo('');
    setFormNotes('');
    setFormResponsible('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: DocumentationItem) => {
    setSelectedProjectId(item.project_id);
    setEditingItem(item);
    setFormType(item.document_type);
    setFormDeadline(item.deadline ? new Date(item.deadline) : undefined);
    setFormStatus(item.status);
    setFormSubmittedDate(item.submitted_date ? new Date(item.submitted_date) : undefined);
    setFormSubmittedTo(item.submitted_to || '');
    setFormNotes(item.notes || '');
    setFormResponsible(item.responsible || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formType.trim()) {
      toast({ title: 'Fyll i dokumenttyp', variant: 'destructive' });
      return;
    }

    const payload = {
      project_id: selectedProjectId,
      document_type: formType.trim(),
      deadline: formDeadline ? format(formDeadline, 'yyyy-MM-dd') : null,
      status: formStatus,
      submitted_date: formSubmittedDate ? format(formSubmittedDate, 'yyyy-MM-dd') : null,
      submitted_to: formSubmittedTo.trim() || null,
      responsible: formResponsible.trim() || null,
      notes: formNotes.trim() || null,
    };

    if (editingItem) {
      const { error } = await supabase.from('documentation_items').update(payload).eq('id', editingItem.id);
      if (error) { toast({ title: 'Fel vid uppdatering', variant: 'destructive' }); return; }
    } else {
      const { error } = await supabase.from('documentation_items').insert(payload);
      if (error) { toast({ title: 'Fel vid tillägg', variant: 'destructive' }); return; }
    }

    setDialogOpen(false);
    fetchItems();
    toast({ title: editingItem ? 'Dokumentation uppdaterad' : 'Dokumentation tillagd' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna dokumentationspunkt?')) return;
    const { error } = await supabase.from('documentation_items').delete().eq('id', id);
    if (error) { toast({ title: 'Fel vid borttagning', variant: 'destructive' }); return; }
    fetchItems();
    toast({ title: 'Dokumentation borttagen' });
  };

  const overdueCount = useMemo(() => 
    items.filter(i => i.deadline && isPast(new Date(i.deadline)) && !isToday(new Date(i.deadline)) && i.status !== 'Inlämnad').length,
    [items]
  );

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Laddar dokumentationsplan...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumentationsplan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} dokument totalt
            {overdueCount > 0 && <span className="text-destructive font-medium"> • {overdueCount} försenade</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-3.5 w-3.5" />
            Arkiverade
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => setExpandedProjects(new Set(activeProjects.map(p => p.id)))}>
            <ChevronsUpDown className="h-3.5 w-3.5" />Expandera alla
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => setExpandedProjects(new Set())}>
            <ChevronsDownUp className="h-3.5 w-3.5" />Komprimera alla
          </Button>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla status</SelectItem>
              <SelectItem value="Ej påbörjad">Ej påbörjad</SelectItem>
              <SelectItem value="Pågående">Pågående</SelectItem>
              <SelectItem value="Inlämnad">Inlämnad</SelectItem>
              <SelectItem value="overdue">Försenade</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project sections */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        {activeProjects.map(project => {
          const projectItems = filteredItems.filter(i => i.project_id === project.id);
          const allProjectItems = items.filter(i => i.project_id === project.id);
          const isExpanded = expandedProjects.has(project.id);
          const hasOverdue = allProjectItems.some(i => i.deadline && isPast(new Date(i.deadline)) && !isToday(new Date(i.deadline)) && i.status !== 'Inlämnad');

          return (
            <Card key={project.id} className={cn("transition-colors", hasOverdue && "border-destructive/30")}>
              <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => toggleProject(project.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <CardTitle className="text-sm font-semibold">
                      {project.code && <span className="text-muted-foreground font-normal mr-1.5">{project.code}</span>}
                      {project.name}
                      {archivedProjectIds.has(project.id) && <Badge variant="secondary" className="ml-2 text-[10px] py-0">Arkiverad</Badge>}
                    </CardTitle>
                    {hasOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{allProjectItems.length} dok</span>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); openAddDialog(project.id); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Lägg till
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <CardContent className="pt-0 px-4 pb-3">
                      {projectItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          {statusFilter !== 'all' ? 'Inga dokument matchar filtret' : 'Inga dokument tillagda ännu'}
                        </p>
                      ) : (
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm table-fixed">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground text-xs">
                                <th className="text-left py-2 px-3 font-medium w-[20%]">Dokumenttyp</th>
                                <th className="text-left py-2 px-3 font-medium w-[10%]">Ansvarig</th>
                                <th className="text-left py-2 px-3 font-medium w-[10%]">Deadline</th>
                                <th className="text-left py-2 px-3 font-medium w-[10%]">Status</th>
                                <th className="text-left py-2 px-3 font-medium w-[12%] hidden md:table-cell">Inlämnat</th>
                                <th className="text-left py-2 px-3 font-medium w-[12%] hidden md:table-cell">Inlämnat till</th>
                                <th className="text-left py-2 px-3 font-medium w-[18%] hidden lg:table-cell">Kommentar</th>
                                <th className="py-2 px-3 w-[8%]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {projectItems.map(item => {
                                const isOverdue = item.deadline && isPast(new Date(item.deadline)) && !isToday(new Date(item.deadline)) && item.status !== 'Inlämnad';
                                return (
                                  <tr key={item.id} className={cn("border-t transition-colors hover:bg-muted/30", isOverdue && "bg-destructive/5")}>
                                    <td className="py-2 px-3 font-medium flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      {item.document_type}
                                    </td>
                                    <td className="py-2 px-3 text-muted-foreground">
                                      {(() => {
                                        const matchedProfile = profiles.find(p => getDisplayName(p) === item.responsible);
                                        if (matchedProfile) {
                                          return (
                                            <div className="flex items-center gap-1.5">
                                              <UserAvatar profile={matchedProfile} size="xs" />
                                              <span className="truncate text-xs">{item.responsible}</span>
                                            </div>
                                          );
                                        }
                                        return item.responsible || '—';
                                      })()}
                                    </td>
                                    <td className={cn("py-2 px-3", isOverdue && "text-destructive font-medium")}>
                                      {item.deadline ? format(new Date(item.deadline), 'd MMM yyyy', { locale: sv }) : '—'}
                                    </td>
                                    <td className="py-2 px-3">{getStatusBadge(item.status, item.deadline)}</td>
                                    <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">
                                      {item.submitted_date ? format(new Date(item.submitted_date), 'd MMM yyyy', { locale: sv }) : '—'}
                                    </td>
                                    <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">{item.submitted_to || '—'}</td>
                                    <td className="py-2 px-3 hidden lg:table-cell text-muted-foreground truncate max-w-[200px]">
                                      {item.notes ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild><span className="cursor-default">{item.notes}</span></TooltipTrigger>
                                          <TooltipContent className="max-w-xs"><p>{item.notes}</p></TooltipContent>
                                        </Tooltip>
                                      ) : '—'}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1 justify-end">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Redigera dokumentation' : 'Lägg till dokumentation'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Dokumenttyp</Label>
              <Input value={formType} onChange={e => setFormType(e.target.value)} placeholder="t.ex. Egenkontroll" list="doc-type-list" />
              <datalist id="doc-type-list">
                {DOC_TYPE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div className="grid gap-2">
              <Label>Ansvarig</Label>
              <UserSelect
                profiles={profiles}
                value={formResponsible || 'none'}
                onValueChange={(v) => setFormResponsible(v === 'none' ? '' : v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal h-10", !formDeadline && "text-muted-foreground")}>
                      {formDeadline ? format(formDeadline, 'd MMM yyyy', { locale: sv }) : 'Välj datum'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formDeadline} onSelect={setFormDeadline} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Datum inlämnat</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal h-10", !formSubmittedDate && "text-muted-foreground")}>
                      {formSubmittedDate ? format(formSubmittedDate, 'd MMM yyyy', { locale: sv }) : 'Välj datum'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formSubmittedDate} onSelect={setFormSubmittedDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Inlämnat till</Label>
                <Input value={formSubmittedTo} onChange={e => setFormSubmittedTo(e.target.value)} placeholder="t.ex. Kund" list="submitted-to-list" />
                <datalist id="submitted-to-list">
                  {SUBMITTED_TO_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Kommentar</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Valfri kommentar..." className="min-h-[60px] resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleSave}>{editingItem ? 'Spara' : 'Lägg till'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
