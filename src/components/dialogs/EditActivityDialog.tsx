import { useState, useEffect } from 'react';
import { CalendarIcon, Pencil, Trash2 } from 'lucide-react';
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
import { Activity, Status, Department, departments, statuses } from '@/data/projectData';
import { cn } from '@/lib/utils';

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
  const [status, setStatus] = useState<Status>(activity.status);
  const [startDate, setStartDate] = useState<Date | undefined>(
    activity.startDate ? new Date(activity.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    activity.endDate ? new Date(activity.endDate) : undefined
  );
  const { updateActivity, deleteActivity } = useProjectDataContext();

  useEffect(() => {
    if (open) {
      setName(activity.name);
      setResponsible(activity.responsible);
      setDepartment(activity.department);
      setStatus(activity.status);
      setStartDate(activity.startDate ? new Date(activity.startDate) : undefined);
      setEndDate(activity.endDate ? new Date(activity.endDate) : undefined);
    }
  }, [open, activity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && responsible.trim()) {
      const days = startDate && endDate 
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : undefined;

      updateActivity(projectId, activity.id, {
        name: name.trim(),
        responsible: responsible.trim(),
        department,
        status,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        days,
        hasWarning: status === 'Försenad',
      });
      setOpen(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Är du säker på att du vill ta bort denna aktivitet?')) {
      deleteActivity(projectId, activity.id);
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-responsible">Ansvarig</Label>
                <Input
                  id="edit-responsible"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Avdelning</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dep) => (
                      <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Startdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "yyyy-MM-dd") : "Välj datum"}
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
              </div>
              <div className="grid gap-2">
                <Label>Slutdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "yyyy-MM-dd") : "Välj datum"}
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
              </div>
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
