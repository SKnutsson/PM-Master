import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useProjectDataContext, ExtendedSalesForecast, DealStatus, ForecastMonthEntry } from '@/contexts/ProjectDataContext';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabels: { [key: string]: string } = {
  Jan: 'Januari',
  Feb: 'Februari', 
  Mar: 'Mars',
  Apr: 'April',
  May: 'Maj',
  Jun: 'Juni',
  Jul: 'Juli',
  Aug: 'Augusti',
  Sep: 'September',
  Oct: 'Oktober',
  Nov: 'November',
  Dec: 'December'
};


const dealStatuses: DealStatus[] = ['Budget', 'Offert', 'Order', 'Fakturerad', 'Förlorad'];

interface EditForecastDialogProps {
  forecast: ExtendedSalesForecast;
  trigger?: React.ReactNode;
}

export function EditForecastDialog({ forecast, trigger }: EditForecastDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [project, setProject] = useState(forecast.project);
  const [product, setProduct] = useState(forecast.product);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [monthAmounts, setMonthAmounts] = useState<{ [key: string]: string }>({});
  const [dealStatus, setDealStatus] = useState<DealStatus>(forecast.dealStatus);
  const [notes, setNotes] = useState(forecast.notes || '');
  const [salesPerson, setSalesPerson] = useState(forecast.salesPerson || '');
  const { updateForecast, deleteForecast } = useProjectDataContext();

  useEffect(() => {
    if (open) {
      setProject(forecast.project);
      setProduct(forecast.product);
      setDealStatus(forecast.dealStatus);
      setNotes(forecast.notes || '');
      setSalesPerson(forecast.salesPerson || '');
      
      // Determine initial year from monthEntries
      const years = (forecast.monthEntries || []).map(e => e.year);
      const initialYear = years.length > 0 ? years[0] : 2026;
      setSelectedYear(initialYear);
      
      // Initialize month amounts for the selected year
      updateMonthAmountsForYear(initialYear);
    }
  }, [open, forecast]);

  const updateMonthAmountsForYear = (year: number) => {
    const amounts: { [key: string]: string } = {};
    months.forEach(m => {
      const entry = (forecast.monthEntries || []).find(e => e.month === m && e.year === year);
      amounts[m] = entry ? entry.amount.toString() : '';
    });
    setMonthAmounts(amounts);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    updateMonthAmountsForYear(year);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build monthEntries with year
    const monthEntries: ForecastMonthEntry[] = [];
    const newMonths: { [key: string]: number } = {};
    Object.entries(monthAmounts).forEach(([month, amount]) => {
      const num = parseFloat(amount);
      if (!isNaN(num) && num > 0) {
        newMonths[month] = num;
        monthEntries.push({ month, year: selectedYear, amount: num });
      }
    });

    // Also keep entries from other years
    const otherYearEntries = (forecast.monthEntries || []).filter(e => e.year !== selectedYear);
    const allEntries = [...otherYearEntries, ...monthEntries];

    if (project.trim() && product.trim()) {
      await updateForecast(forecast.id, {
        project: project.trim(),
        product: product.trim(),
        months: newMonths,
        monthEntries: allEntries,
        dealStatus,
        notes: notes.trim() || '',
        salesPerson: salesPerson.trim() || undefined,
      });
      setOpen(false);
    }
  };

  const handleDelete = async () => {
    await deleteForecast(forecast.id);
    setConfirmOpen(false);
    setOpen(false);
  };

  const totalAmount = Object.values(forecast.months || {}).reduce((s, v) => s + (v || 0), 0);

  const handleMonthChange = (month: string, value: string) => {
    setMonthAmounts(prev => ({ ...prev, [month]: value }));
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Redigera affär</DialogTitle>
            <DialogDescription>
              Uppdatera affärens detaljer och belopp per månad.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-forecast-project">Projektnamn</Label>
              <Input
                id="edit-forecast-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Produkttyp</Label>
              <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="t.ex. Teleskopläktare"
              />
            </div>

            <div className="grid gap-2">
              <Label>Ansvarig säljare</Label>
              <Input
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                placeholder="t.ex. Johan Andersson"
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={dealStatus} onValueChange={(v) => setDealStatus(v as DealStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dealStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Belopp per månad (MSEK)</Label>
                <Select value={String(selectedYear)} onValueChange={(v) => handleYearChange(Number(v))}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {months.map((m) => (
                  <div key={m} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{monthLabels[m]}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={monthAmounts[m] || ''}
                      onChange={(e) => handleMonthChange(m, e.target.value)}
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Anteckningar</Label>
              <Input
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Ta bort
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Radera affär permanent?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Du är på väg att radera <strong>{forecast.project}</strong> ({forecast.product}
                    {totalAmount ? ` · ${totalAmount.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} MSEK` : ''}).
                    <br />
                    Detta går inte att ångra.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => { e.preventDefault(); handleDelete(); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Radera permanent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={!project.trim() || !product.trim()}>
                Spara
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
