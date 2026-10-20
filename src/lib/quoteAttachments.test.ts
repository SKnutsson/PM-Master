import { describe, expect, it } from 'vitest';
import { quoteAttachmentError, quoteAttachmentPath } from './quoteAttachments';

describe('quote attachments', () => {
  it('accepts PDF attachments including missing browser MIME type', () => {
    expect(quoteAttachmentError({ name: 'offert.pdf', type: 'application/pdf', size: 100 })).toBeNull();
    expect(quoteAttachmentError({ name: 'offert.PDF', type: '', size: 100 })).toBeNull();
    expect(quoteAttachmentError({ name: 'offert.exe', type: 'application/octet-stream', size: 100 })).not.toBeNull();
  });
  it('gives multiple files distinct paths, even with identical names', () => {
    const paths = [quoteAttachmentPath('quote-id', 'offert.pdf'), quoteAttachmentPath('quote-id', 'offert.pdf')];
    expect(new Set(paths).size).toBe(2);
    expect(paths.every(path => path.startsWith('quote-id/'))).toBe(true);
  });
});