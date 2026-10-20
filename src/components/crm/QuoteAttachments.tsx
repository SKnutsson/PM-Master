import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { quoteAttachmentError, quoteAttachmentPath } from '@/lib/quoteAttachments';

interface Attachment { id: string; name: string; path: string; }
interface Props {
  quoteId?: string;
  droppedFiles: File[];
  pendingFiles: File[];
  onPendingChange: (files: File[]) => void;
  onBusyChange: (busy: boolean) => void;
}

export function QuoteAttachments({ quoteId, droppedFiles, pendingFiles, onPendingChange, onBusyChange }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!quoteId);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const handledDrop = useRef<File[] | null>(null);

  useEffect(() => {
    if (!quoteId) return;
    let active = true;
    supabase.from('crm_quote_attachments').select('id, name, path').eq('quote_id', quoteId).order('created_at').then(({ data, error }) => {
      if (!active) return;
      setLoading(false);
      if (error) toast.error('Kunde inte hämta bilagorna');
      else setAttachments(data || []);
    });
    return () => { active = false; };
  }, [quoteId]);

  const setWorking = (value: boolean) => { lock.current = value; setBusy(value); onBusyChange(value); };
  const addFiles = async (files: File[]) => {
    if (lock.current || loading) { toast.info('Vänta tills bilagorna är klara'); return; }
    const valid = files.filter(file => {
      const error = quoteAttachmentError(file);
      if (error) toast.error(`${file.name}: ${error}`);
      return !error;
    });
    if (!quoteId) { onPendingChange([...pendingFiles, ...valid]); return; }
    setWorking(true);
    try {
      for (const file of valid) {
        const path = quoteAttachmentPath(quoteId, file.name);
        const { error: uploadError } = await supabase.storage.from('quote-pdfs').upload(path, file, { contentType: 'application/pdf' });
        if (uploadError) { toast.error(`${file.name}: ${uploadError.message}`); continue; }
        const { data, error } = await supabase.from('crm_quote_attachments').insert({ quote_id: quoteId, name: file.name, path, size: file.size }).select('id, name, path').single();
        if (error || !data) {
          await supabase.storage.from('quote-pdfs').remove([path]);
          toast.error(`Kunde inte spara ${file.name}`);
        } else {
          setAttachments(current => [...current, data]);
          toast.success(`${file.name} bifogad`);
        }
      }
    } catch { toast.error('Kunde inte ladda upp bilagan'); }
    finally { setWorking(false); }
  };

  useEffect(() => {
    if (!droppedFiles.length || handledDrop.current === droppedFiles) return;
    handledDrop.current = droppedFiles;
    void addFiles(droppedFiles);
  }, [droppedFiles]);

  const openFile = async (attachment: Attachment) => {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    const { data, error } = await supabase.storage.from('quote-pdfs').createSignedUrl(attachment.path, 60);
    if (error || !data) { tab?.close(); toast.error('Kunde inte öppna filen'); return; }
    if (tab) tab.location.href = data.signedUrl;
    else toast.error('Tillåt popupfönster för att öppna bilagan');
  };

  const removeFile = async (attachment: Attachment) => {
    if (!quoteId || !confirm(`Ta bort ${attachment.name}?`)) return;
    setWorking(true);
    try {
      // Clear the legacy mirror first so saving the quote cannot resurrect a removed file.
      const mirror = await supabase.from('crm_quotes').update({ pdf_path: null, pdf_name: null }).eq('id', quoteId).eq('pdf_path', attachment.path);
      if (mirror.error) throw mirror.error;
      const { error } = await supabase.from('crm_quote_attachments').delete().eq('id', attachment.id);
      if (error) throw error;
      setAttachments(current => current.filter(item => item.id !== attachment.id));
      const removed = await supabase.storage.from('quote-pdfs').remove([attachment.path]);
      if (removed.error) toast.error('Bilagan togs bort, men filen kunde inte rensas');
      else toast.success('Bilagan togs bort');
    } catch { toast.error('Kunde inte ta bort bilagan'); }
    finally { setWorking(false); }
  };

  return <div className="space-y-2">
    <input ref={input} type="file" multiple accept="application/pdf,.pdf" className="hidden" aria-label="Lägg till offertbilagor" onChange={event => { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
    {loading && <div className="text-sm text-muted-foreground">Laddar bilagor…</div>}
    {attachments.map(attachment => <div key={attachment.id} className="flex min-w-0 items-center gap-1 border-b border-border py-1">
      <Button variant="ghost" className="min-w-0 flex-1 justify-start gap-2 px-2" disabled={busy} onClick={() => void openFile(attachment)} title={attachment.name}><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{attachment.name}</span></Button>
      <Button variant="ghost" size="icon" disabled={busy} aria-label={`Ta bort ${attachment.name}`} onClick={() => void removeFile(attachment)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
    </div>)}
    {pendingFiles.map((file, index) => <div key={index} className="flex min-w-0 items-center gap-2 border-b border-border py-1 text-sm"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="flex-1 truncate">{file.name}</span><Button variant="ghost" size="icon" aria-label={`Ta bort ${file.name}`} onClick={() => onPendingChange(pendingFiles.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
    <Button variant="outline" className="w-full justify-start gap-2 border-dashed font-normal" disabled={busy || loading} onClick={() => input.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}{busy ? 'Laddar upp…' : 'Bifoga PDF'}</Button>
  </div>;
}