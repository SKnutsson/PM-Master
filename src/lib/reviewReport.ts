import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project } from '@/data/projectData';
import type { ReviewRecord, RowRecord, AnswerRecord, SignoffRecord } from '@/hooks/useProjectReview';
import type { ReviewSection } from '@/lib/reviewTemplate';
import { riskLevel } from '@/lib/reviewTemplate';

const BRAND = {
  primary: [28, 127, 114] as [number, number, number],
  dark: [24, 50, 58] as [number, number, number],
};

function title(doc: jsPDF, y: number, text: string): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + 20 > ph - 15) { doc.addPage(); y = 20; }
  doc.setFillColor(...BRAND.primary);
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(text, 17, y + 5.8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

export function generateReviewSummaryPdf(opts: {
  project: Project;
  review: ReviewRecord;
  sections: ReviewSection[];
  answers: Record<string, AnswerRecord>;
  rows: RowRecord[];
  signoffs: SignoffRecord[];
  progress: { percent: number; done: number; total: number };
}) {
  const { project, review, sections, answers, rows, signoffs, progress } = opts;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.setFont('helvetica', 'bold');
  doc.text('Projektgenomgång – Sammanfattning', 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${project.code} – ${project.name}`, 14, 23);
  doc.setTextColor(0, 0, 0);

  let y = 38;
  const h = review.header || {};
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: BRAND.primary },
    head: [['Fält', 'Värde', 'Fält', 'Värde']],
    body: [
      ['Kund', String(h.customer ?? project.customer ?? '–'), 'Projektnummer', String(h.project_number ?? project.code ?? '–')],
      ['Slutkund', String(h.end_customer ?? '–'), 'Ordernummer', String(h.order_number ?? '–')],
      ['Datum för genomgång', String(review.review_date ?? '–'), 'Version', String(review.version)],
      ['Status', review.status, 'Färdigställt', `${progress.percent}% (${progress.done}/${progress.total})`],
      ['Ansvarig säljare', String(h.sales_person ?? project.salesPerson ?? '–'), 'Projektledare', String(h.project_manager ?? project.projectManager ?? '–')],
      ['Konstruktionschef', String(h.design_lead ?? '–'), 'Produktionsansvarig', String(h.production_lead ?? '–')],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  for (const section of sections) {
    if (section.kind === 'table') {
      const secRows = rows.filter(r => r.section_key === section.key);
      if (!secRows.length) continue;
      y = title(doc, y, section.title);
      const cols = (section.columns || []).slice(0, 7);
      autoTable(doc, {
        startY: y,
        theme: 'striped',
        styles: { fontSize: 7.5, cellPadding: 1.4, overflow: 'linebreak' },
        headStyles: { fillColor: BRAND.dark },
        head: [[...cols.map(c => c.label), ...(section.key === 'risks' ? ['Riskvärde'] : [])]],
        body: secRows.map(r => [
          ...cols.map(c => String(r.data[c.key] ?? '–')),
          ...(section.key === 'risks' ? [String(riskLevel(r.data.probability, r.data.consequence).value)] : []),
        ]),
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      if (section.key === 'scope') {
        const excluded = secRows.filter(r => r.data.included === 'Ingår ej');
        if (excluded.length) {
          y = title(doc, y, 'EJ INGÅENDE');
          autoTable(doc, {
            startY: y, theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.6 },
            headStyles: { fillColor: [180, 60, 60] as [number, number, number] },
            head: [['Kategori', 'Beskrivning', 'Hänvisning']],
            body: excluded.map(r => [String(r.data.category ?? '–'), String(r.data.description ?? '–'), String(r.data.doc_ref ?? '–')]),
          });
          y = (doc as any).lastAutoTable.finalY + 6;
        }
      }
    } else {
      const filled = (section.fields || []).filter(f => {
        const a = answers[`${section.key}.${f.key}`];
        return a && (a.value !== null && a.value !== undefined && a.value !== '');
      });
      if (!filled.length) continue;
      y = title(doc, y, section.title);
      autoTable(doc, {
        startY: y, theme: 'striped',
        styles: { fontSize: 7.5, cellPadding: 1.4, overflow: 'linebreak' },
        headStyles: { fillColor: BRAND.dark },
        head: [['Punkt', 'Svar', 'Källa', 'Dokument/rev', 'Ansvarig', 'Kommentar']],
        body: filled.map(f => {
          const a = answers[`${section.key}.${f.key}`];
          return [f.label, String(a.value ?? '–'), a.source ?? '–', [a.document_ref, a.revision, a.page_ref].filter(Boolean).join(' / ') || '–', a.responsible ?? '–', a.comment ?? '–'];
        }),
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  if (review.general_note) {
    y = title(doc, y, 'Övrig information / ej dokumenterat ovan');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(review.general_note, pageW - 30);
    doc.text(lines, 15, y + 2);
    y += lines.length * 4.5 + 8;
  }

  y = title(doc, y, 'Godkännanden');
  autoTable(doc, {
    startY: y, theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: BRAND.primary },
    head: [['Roll', 'Intygande', 'Namn', 'Datum', 'Godkänd']],
    body: signoffs.map(s => [s.role, s.statement ?? '–', s.approved_name ?? '–',
      s.approved_at ? new Date(s.approved_at).toLocaleString('sv-SE') : '–', s.approved ? 'Ja' : 'Nej']),
  });

  doc.save(`Projektgenomgang_${project.code}_${project.name}.pdf`.replace(/\s+/g, '_'));
}
