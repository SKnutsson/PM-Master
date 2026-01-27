import { useState } from 'react';
import { Plus, CalendarIcon } from 'lucide-react';
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
import { Status, Department, departments, statuses } from '@/data/projectData';
import { cn } from '@/lib/utils';

interface AddActivityDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

export function AddActivityDialog({ projectId, trigger }: AddActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [responsible, setResponsible] = useState('');
  const [department, setDepartment] = useState<Department>('Projektledare');
  const [status, setStatus] = useState<Status>('Ej påbörjad');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { addActivity } = useProjectDataContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && responsible.trim()) {
      const days = startDate && endDate 
        ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : undefined;

      addActivity(projectId, {
        name: name.trim(),
        responsible: responsible.trim(),
        department,
        status,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        days,
        hasWarning: status === 'Försenad',
      });
      resetForm();
      setOpen(false);
    }
  };

  const resetForm = () => {
    setName('');
    setResponsible('');
    setDepartment('Projektledare');
    setStatus('Ej påbörjad');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="ghost">
            <Plus className="mr-1 h-3 w-3" />
            Lägg till aktivitet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Lägg till aktivitet</DialogTitle>
            <DialogDescription>
              Skapa en ny aktivitet för detta projekt.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activity-name">Aktivitetsnamn</Label>
              <Input
                id="activity-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Konstruktion"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="responsible">Ansvarig</Label>
                <Input
                  id="responsible"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="t.ex. SK"
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={!name.trim() || !responsible.trim()}>
              Lägg till
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
