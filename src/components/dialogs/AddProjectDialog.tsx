import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useProjectDataContext } from '@/contexts/ProjectDataContext';
import { geocodeAddress } from '@/lib/geocode';
import { toast } from 'sonner';

export function AddProjectDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const [product, setProduct] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { addProject } = useProjectDataContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (address.trim()) {
      const geo = await geocodeAddress(address);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lon;
      } else {
        toast.warning('Kunde inte hitta koordinater för adressen – sparar utan kartposition.');
      }
    }
    await addProject({
      code: code.trim(),
      name: name.trim(),
      customer: customer.trim(),
      projectManager: projectManager.trim(),
      salesPerson: salesPerson.trim(),
      product: product.trim(),
      address: address.trim(),
      latitude,
      longitude,
      notes: notes.trim(),
      activities: [],
    });
    setCode('');
    setName('');
    setCustomer('');
    setProjectManager('');
    setSalesPerson('');
    setProduct('');
    setAddress('');
    setNotes('');
    setOpen(false);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nytt projekt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Lägg till nytt projekt</DialogTitle>
            <DialogDescription>
              Fyll i projektinformation nedan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Projektkod</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="t.ex. 10040"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Projektnamn</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="t.ex. Nya Arenan"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer">Kund</Label>
              <Input
                id="customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Kundnamn"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="projectManager">Projektledare</Label>
                <Input
                  id="projectManager"
                  value={projectManager}
                  onChange={(e) => setProjectManager(e.target.value)}
                  placeholder="Namn"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salesPerson">Ansvarig säljare</Label>
                <Input
                  id="salesPerson"
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  placeholder="Namn"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product">Såld produkt</Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="t.ex. Teleskopläktare"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Noteringar</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Övrig information..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={!code.trim() || !name.trim()}>
              Skapa projekt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
