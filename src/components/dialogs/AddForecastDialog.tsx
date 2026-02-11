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
import { useProjectDataContext, DealStatus } from '@/contexts/ProjectDataContext';

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

const dealStatuses: DealStatus[] = ['Prognos', 'Ny affär', 'Tagen', 'Flyttad', 'Förlorad'];

export function AddForecastDialog() {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState('');
  const [product, setProduct] = useState('');
  const [month, setMonth] = useState('Jan');
  const [amount, setAmount] = useState('');
  const [dealStatus, setDealStatus] = useState<DealStatus>('Prognos');
  const [notes, setNotes] = useState('');
  const { addForecast } = useProjectDataContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (project.trim() && product.trim() && !isNaN(amountNum)) {
      await addForecast({
        project: project.trim(),
        product: product.trim(),
        months: { [month]: amountNum },
        monthsByYear: { 2026: { [month]: amountNum } },
        dealStatus,
        notes: notes.trim() || undefined,
      });
      resetForm();
      setOpen(false);
    }
  };

  const resetForm = () => {
    setProject('');
    setProduct('');
    setMonth('Jan');
    setAmount('');
    setDealStatus('Prognos');
    setNotes('');
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
              <Label>Produkttyp</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj produkttyp" />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              disabled={!project.trim() || !product.trim() || !amount}
            >
              Lägg till
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
