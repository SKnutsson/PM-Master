import { useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BUCKET = 'project-review-attachments';
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface Props {
  reviewId: string;
  rowId: string;
  name?: string;
  path?: string;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
}

export function ReviewFileAttachment({ reviewId, rowId, name, path, onSave }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const upload = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) {
      toast({ title: 'Fel filformat', description: 'Välj en PDF-, DOC- eller DOCX-fil.', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Filen är för stor', description: 'Maximal filstorlek är 20 MB.', variant: 'destructive' });
      return;
    }

    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const nextPath = `${reviewId}/${rowId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(nextPath, file, { contentType: file.type, upsert: false });
    if (error) {
      setBusy(false);
      toast({ title: 'Kunde inte ladda upp filen', description: error.message, variant: 'destructive' });
      return;
    }

    const saved = await onSave({ attachment_name: file.name, attachment_path: nextPath, attachment_size: file.size });
    if (!saved) {
      await supabase.storage.from(BUCKET).remove([nextPath]);
      toast({ title: 'Filen kunde inte sparas på dokumentraden', variant: 'destructive' });
    } else {
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      toast({ title: 'Filen bifogades' });
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const open = async () => {
    if (!path) return;
    setBusy(true);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    setBusy(false);
    if (error || !data?.signedUrl) {
      toast({ title: 'Kunde inte öppna filen', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const remove = async () => {
    if (!path || !window.confirm(`Ta bort bilagan ${name || ''}?`)) return;
    setBusy(true);
    const saved = await onSave({ attachment_name: null, attachment_path: null, attachment_size: null });
    if (saved) {
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) toast({ title: 'Bilagan kopplades bort men filen kunde inte rensas', description: error.message, variant: 'destructive' });
      else toast({ title: 'Bilagan togs bort' });
    } else {
      toast({ title: 'Kunde inte ta bort bilagan', variant: 'destructive' });
    }
    setBusy(false);
  };

  return (
    <div className="flex min-w-[180px] items-center gap-1.5">
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
      {name && path ? (
        <>
          <Button type="button" variant="outline" size="sm" className="h-8 min-w-0 flex-1 justify-start gap-1.5" disabled={busy} onClick={() => void open()} title={name}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{name}</span>
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => void remove()} title="Ta bort bilaga">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          Bifoga fil
        </Button>
      )}
    </div>
  );
}