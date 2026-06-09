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
  const [segments, setSegments] = useState<ActivitySegment[]>(activity.segments || []);
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
      setSegments(activity.segments || []);
    }
  }, [open, activity]);

  const addSegment = () => {
    // Default: if there are existing segments, take last segment's end + 14d gap, +14d duration.
    // Otherwise, seed two segments from the activity's start/end with a gap in the middle.
    if (segments.length === 0 && startDate && endDate) {
      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
      const halfDays = Math.max(1, Math.floor(totalDays / 3));
      const seg1End = new Date(startDate); seg1End.setDate(seg1End.getDate() + halfDays);
      const seg2Start = new Date(seg1End); seg2Start.setDate(seg2Start.getDate() + Math.max(1, Math.floor(totalDays / 3)));
      setSegments([
        { start: format(startDate, 'yyyy-MM-dd'), end: format(seg1End, 'yyyy-MM-dd') },
        { start: format(seg2Start, 'yyyy-MM-dd'), end: format(endDate, 'yyyy-MM-dd') },
      ]);
      return;
    }
    const last = segments[segments.length - 1];
    const lastEnd = last ? new Date(last.end) : (endDate || new Date());
    const newStart = new Date(lastEnd); newStart.setDate(newStart.getDate() + 14);
    const newEnd = new Date(newStart); newEnd.setDate(newEnd.getDate() + 14);
    setSegments([...segments, { start: format(newStart, 'yyyy-MM-dd'), end: format(newEnd, 'yyyy-MM-dd') }]);
  };

  const updateSegment = (idx: number, patch: Partial<ActivitySegment>) => {
    setSegments(segments.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const removeSegment = (idx: number) => {
    setSegments(segments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && responsible.trim()) {
      const effectiveEndDate = isMilestone && startDate ? startDate : endDate;
      const useSegments = !isMilestone && segments.length >= 2;
      // When using segments, sync start/end to min/max of segment dates
      const sortedStarts = [...segments].map(s => s.start).sort();
      const sortedEnds = [...segments].map(s => s.end).sort();
      const finalStart = useSegments ? sortedStarts[0] : (startDate ? format(startDate, 'yyyy-MM-dd') : null);
      const finalEnd = useSegments ? sortedEnds[sortedEnds.length - 1] : (effectiveEndDate ? format(effectiveEndDate, 'yyyy-MM-dd') : null);
      const days = finalStart && finalEnd
        ? Math.ceil((new Date(finalEnd).getTime() - new Date(finalStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : undefined;

      await updateActivity(projectId, activity.id, {
        name: name.trim(),
        responsible: responsible.trim(),
        department,
        status,
        startDate: finalStart,
        endDate: finalEnd,
        days,
        hasWarning: status === 'Försenad',
        phase: phase || null,
        isMilestone,
        notes: notes.trim() || null,
        segments: useSegments ? segments : null,
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
                        showWeekNumber
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
                        showWeekNumber
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

            {!isMilestone && (
              <div className="grid gap-2 rounded-md border border-dashed border-border/60 p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Split className="h-3.5 w-3.5" />
                    Splitta aktivitet (pauser)
                  </Label>
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={addSegment}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {segments.length === 0 ? 'Dela upp' : 'Lägg till del'}
                  </Button>
                </div>
                {segments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aktiviteten visas som en sammanhängande stapel. Dela upp för att t.ex. pausa under semester och återuppta senare.
                  </p>
                ) : segments.length === 1 ? (
                  <p className="text-xs text-status-delayed">
                    Lägg till minst en del till för att aktivera splittning.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {segments.length} delar – startdatum och slutdatum ovan synkas automatiskt till första/sista del.
                  </p>
                )}
                {segments.length > 0 && (
                  <div className="space-y-1.5">
                    {segments.map((seg, idx) => {
                      const segStart = seg.start ? new Date(seg.start) : undefined;
                      const segEnd = seg.end ? new Date(seg.end) : undefined;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="w-12 text-muted-foreground">Del {idx + 1}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="h-8 flex-1 justify-start text-left font-normal text-xs">
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                {segStart ? format(segStart, "yyyy-MM-dd") : "Datum"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={segStart}
                                onSelect={(d) => d && updateSegment(idx, { start: format(d, 'yyyy-MM-dd') })}
                                initialFocus
                                showWeekNumber
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground">→</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="h-8 flex-1 justify-start text-left font-normal text-xs">
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                {segEnd ? format(segEnd, "yyyy-MM-dd") : "Datum"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={segEnd}
                                onSelect={(d) => d && updateSegment(idx, { end: format(d, 'yyyy-MM-dd') })}
                                initialFocus
                                showWeekNumber
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeSegment(idx)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}


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
