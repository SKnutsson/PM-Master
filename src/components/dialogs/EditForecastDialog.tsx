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
import { useProjectDataContext, ExtendedSalesForecast, DealStatus } from '@/contexts/ProjectDataContext';

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

const productTypes = [
  'Teleskopläktare',
  'Kalle',
  'Stadium Comfort',
  'Abacus/plast stol',
  'Egen tillverkning/inköp',
  'Montage fasta stolar',
  'Övrigt'
];

const dealStatuses: DealStatus[] = ['Prognos', 'Tagen', 'Flyttad', 'Förlorad'];

interface EditForecastDialogProps {
  forecast: ExtendedSalesForecast;
  trigger?: React.ReactNode;
}

export function EditForecastDialog({ forecast, trigger }: EditForecastDialogProps) {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState(forecast.project);
  const [product, setProduct] = useState(forecast.product);
  const [monthAmounts, setMonthAmounts] = useState<{ [key: string]: string }>({});
  const [dealStatus, setDealStatus] = useState<DealStatus>(forecast.dealStatus);
  const [notes, setNotes] = useState(forecast.notes || '');
  const { updateForecast, deleteForecast } = useProjectDataContext();

  useEffect(() => {
    if (open) {
      setProject(forecast.project);
      setProduct(forecast.product);
      setDealStatus(forecast.dealStatus);
      setNotes(forecast.notes || '');
      
      // Initialize month amounts
      const amounts: { [key: string]: string } = {};
      months.forEach(m => {
        amounts[m] = forecast.months[m]?.toString() || '';
      });
      setMonthAmounts(amounts);
    }
  }, [open, forecast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert string amounts to numbers
    const newMonths: { [key: string]: number } = {};
    Object.entries(monthAmounts).forEach(([month, amount]) => {
      const num = parseFloat(amount);
      if (!isNaN(num) && num > 0) {
        newMonths[month] = num;
      }
    });

    if (project.trim() && product.trim()) {
      await updateForecast(forecast.id, {
        project: project.trim(),
        product: product.trim(),
        months: newMonths,
        dealStatus,
        notes: notes.trim() || undefined,
      });
      setOpen(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Är du säker på att du vill ta bort denna affär?')) {
      await deleteForecast(forecast.id);
      setOpen(false);
    }
  };

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
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Belopp per månad (MSEK)</Label>
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
            <Button type="button" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Ta bort
            </Button>
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
