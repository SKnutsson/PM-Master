import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { useProjectDataContext, DealStatus, ForecastMonthEntry } from '@/contexts/ProjectDataContext';

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

const dealStatuses: DealStatus[] = ['Budget', 'Offert', 'Order', 'Fakturerad', 'Förlorad'];

export function AddForecastDialog() {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState('');
  const [product, setProduct] = useState('');
  const [month, setMonth] = useState('Jan');
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState('');
  const [dealStatus, setDealStatus] = useState<DealStatus>('Budget');
  const [notes, setNotes] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const { addForecast } = useProjectDataContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (project.trim() && product.trim() && !isNaN(amountNum)) {
      await addForecast({
        project: project.trim(),
        product: product.trim(),
        months: { [month]: amountNum },
        monthEntries: [{ month, year, amount: amountNum }],
        dealStatus,
        notes: notes.trim() || undefined,
        salesPerson: salesPerson.trim() || undefined,
      });
      resetForm();
      setOpen(false);
    }
  };

  const resetForm = () => {
    setProject('');
    setProduct('');
    setMonth('Jan');
    setYear(new Date().getFullYear());
    setAmount('');
    setDealStatus('Budget');
    setNotes('');
    setSalesPerson('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ny affär
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Lägg till ny affär</DialogTitle>
            <DialogDescription>
              Lägg till en ny affär i försäljningsprognosen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="forecast-project">Projektnamn</Label>
              <Input
                id="forecast-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="t.ex. Nya Arenan"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="forecast-product">Produkttyp</Label>
              <Input
                id="forecast-product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="t.ex. Teleskopläktare"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>År</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Månad</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>{monthLabels[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Belopp (MSEK)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="t.ex. 2.50"
                />
              </div>
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
              <Label htmlFor="sales-person">Ansvarig säljare <span className="text-destructive">*</span></Label>
              <Input
                id="sales-person"
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                placeholder="t.ex. Johan Andersson"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Anteckningar (valfritt)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="t.ex. Leverans April /SK"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button 
              type="submit" 
              disabled={!project.trim() || !product.trim() || !amount || !salesPerson.trim()}
            >
              Lägg till
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
