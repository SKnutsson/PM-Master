import { useState, useEffect } from 'react';
import { CalendarIcon, Pencil, Trash2, X, Diamond, Split, Plus } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';
import { UserSelect } from '@/components/UserSelect';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { Activity, ActivitySegment, Status, Department, departments, statuses, Phase, phases } from '@/data/projectData';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface EditActivityDialogProps {
  projectId: string;
  activity: Activity;
  trigger?: React.ReactNode;
}

export function EditActivityDialog({ projectId, activity, trigger }: EditActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(activity.name);
  const [responsible, setResponsible] = useState(activity.responsible);
  const [department, setDepartment] = useState<Department>(activity.department);
  const { profiles } = useProfiles();
  const [status, setStatus] = useState<Status>(activity.status);
  const [startDate, setStartDate] = useState<Date | undefined>(
    activity.startDate ? new Date(activity.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    activity.endDate ? new Date(activity.endDate) : undefined
  );
  const [phase, setPhase] = useState<Phase | ''>(activity.phase || '');
  const [isMilestone, setIsMilestone] = useState(activity.isMilestone || false);
  const [notes, setNotes] = useState(activity.notes || '');
  const { updateActivity, deleteActivity } = useProjectDataContext();

  useEffect(() => {
    if (open) {
      setName(activity.name);
      setResponsible(activity.responsible);
      setDepartment(activity.department);
      setStatus(activity.status);
      setStartDate(activity.startDate ? new Date(activity.startDate) : undefined);
      setEndDate(activity.endDate ? new Date(activity.endDate) : undefined);
      setPhase(activity.phase || '');
      setIsMilestone(activity.isMilestone || false);
      setNotes(activity.notes || '');
    }
  }, [open, activity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && responsible.trim()) {
      const effectiveEndDate = isMilestone && startDate ? startDate : endDate;
      const days = startDate && effectiveEndDate 
        ? Math.ceil((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : undefined;

      await updateActivity(projectId, activity.id, {
        name: name.trim(),
        responsible: responsible.trim(),
        department,
        status,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        endDate: effectiveEndDate ? format(effectiveEndDate, 'yyyy-MM-dd') : null,
        days,
        hasWarning: status === 'Försenad',
        phase: phase || null,
        isMilestone,
        notes: notes.trim() || null,
      });
      setOpen(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Är du säker på att du vill ta bort denna aktivitet?')) {
      await deleteActivity(projectId, activity.id);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Redigera aktivitet</DialogTitle>
            <DialogDescription>
              Uppdatera aktivitetens detaljer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-activity-name">Aktivitetsnamn</Label>
              <Input
                id="edit-activity-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-responsible">Ansvarig</Label>
              <UserSelect
                profiles={profiles}
                value={responsible || 'none'}
                onValueChange={(v) => setResponsible(v === 'none' ? '' : v)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Fas (valfritt)</Label>
              <Select value={phase || 'none'} onValueChange={(v) => setPhase(v === 'none' ? '' : v as Phase)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ingen fas vald" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen fas</SelectItem>
                  {phases.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-milestone"
                checked={isMilestone}
                onCheckedChange={(checked) => setIsMilestone(checked === true)}
              />
              <Label htmlFor="edit-milestone" className="flex items-center gap-1.5 cursor-pointer">
                <Diamond className="h-3.5 w-3.5" />
                Milstolpe
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Startdatum</Label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "yyyy-MM-dd") : "Inget datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {startDate && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setStartDate(undefined)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Slutdatum</Label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "yyyy-MM-dd") : "Inget datum"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {endDate && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setEndDate(undefined)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Kommentar</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lägg till en kommentar..."
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Ta bort
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={!name.trim() || !responsible.trim()}>
                Spara
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
