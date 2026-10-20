export const QUOTE_PDF_MAX_BYTES = 25 * 1024 * 1024;

export function quoteAttachmentError(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (file.type !== 'application/pdf' && !(file.type === '' && /\.pdf$/i.test(file.name))) return 'Endast PDF-filer kan bifogas';
  if (file.size > QUOTE_PDF_MAX_BYTES) return 'Filen är för stor. Maximal filstorlek är 25 MB.';
  if (file.size === 0) return 'Filen är tom';
  return null;
}

export function quoteAttachmentPath(quoteId: string, fileName: string): string {
  return `${quoteId}/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}