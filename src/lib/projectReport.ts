import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/data/projectData';

// Brand palette (matches app)
const BRAND = {
  primary: [28, 127, 114] as [number, number, number],   // #1C7F72
  dark: [24, 50, 58] as [number, number, number],        // #18323A
  light: [146, 174, 157] as [number, number, number],    // #92AE9D
  rowAlt: [235, 242, 240] as [number, number, number],
};

function fmtDate(d?: string | null) {
  if (!d) return '–';
  try { return new Date(d).toLocaleDateString('sv-SE'); } catch { return String(d); }
}

function ensureSpace(doc: jsPDF, y: number, needed = 30): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - 15) { doc.addPage(); return 20; }
  return y;
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  y = ensureSpace(doc, y, 18);
  doc.setFillColor(...BRAND.primary);
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 17, y + 5.8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

function daysBetween(a?: string | null, b?: string | null): string {
  if (!a || !b) return '–';
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (isNaN(ms)) return '–';
  return String(Math.max(1, Math.round(ms / 86400000) + 1));
}

export async function generateProjectReport(project: Project): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // ==== Header ====
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Projektrapport', 14, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${project.code} – ${project.name}`, 14, 23);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Genererad ${new Date().toLocaleString('sv-SE')}`, pageW - 14, 15, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  let y = 40;

  // ==== Metadata ====
  y = sectionTitle(doc, y, 'Projektinformation');
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      ['Projektnummer', project.code || '–', 'Status', project.status || 'Aktiv'],
      ['Kund', project.customer || '–', 'Såld produkt', project.product || '–'],
      ['Projektledare', project.projectManager || '–', 'Ansvarig säljare', project.salesPerson || '–'],
      ['Adress', project.address || '–', '', ''],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, textColor: BRAND.dark },
      2: { fontStyle: 'bold', cellWidth: 32, textColor: BRAND.dark },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;
  if (project.notes) {
    y = ensureSpace(doc, y, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold'); doc.text('Noteringar:', 14, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(project.notes, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // ==== Ganttschema – full aktivitetslista ====
  y = sectionTitle(doc, y, 'Ganttschema – alla aktiviteter');
  autoTable(doc, {
    startY: y,
    head: [['#', 'Aktivitet', 'Fas', 'Avdelning', 'Ansvarig', 'Status', 'Startdatum', 'Slutdatum', 'Dagar']],
    body: (project.activities || []).map((a, i) => [
      String(i + 1),
      a.name + (a.isMilestone ? '  ★' : ''),
      a.phase || '–',
      a.department || '–',
      a.responsible || '–',
      a.status || '–',
      fmtDate(a.startDate),
      fmtDate(a.endDate),
      a.days != null ? String(a.days) : daysBetween(a.startDate, a.endDate),
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    alternateRowStyles: { fillColor: BRAND.rowAlt },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ==== Fetch data ====
  const [
    { data: kpi },
    { data: allocs },
    { data: dailies },
    { data: docs },
    { data: ataItems },
  ] = await Promise.all([
    supabase.from('project_kpi_metrics').select('*').eq('project_id', project.id).order('created_at'),
    supabase.from('project_resource_allocations').select('*, installers(name, company)').eq('project_id', project.id).order('start_date'),
    supabase.from('daily_resource_entries').select('*, installers(name, company)').eq('project_id', project.id).order('date'),
    supabase.from('documentation_items').select('*').eq('project_id', project.id).order('sort_order'),
    supabase.from('ata_items').select('*').eq('project_id', project.id).order('date'),
  ]);

  // ==== Resursplanering – allokeringar ====
  if (allocs && allocs.length) {
    y = sectionTitle(doc, y, 'Resursplanering – allokeringar');
    autoTable(doc, {
      startY: y,
      head: [['Montör', 'Företag', 'Från', 'Till', 'Dagar', 'Planerade timmar']],
      body: allocs.map((a: any) => [
        a.installers?.name || 'Vakant',
        a.installers?.company || '–',
        fmtDate(a.start_date),
        fmtDate(a.end_date),
        daysBetween(a.start_date, a.end_date),
        a.planned_hours ?? '–',
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
      alternateRowStyles: { fillColor: BRAND.rowAlt },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==== Resursplanering – alla arbetspass (dagsentries) ====
  if (dailies && dailies.length) {
    y = sectionTitle(doc, y, 'Resursplanering – alla arbetspass');

    const totalWork = dailies.reduce((s: number, d: any) => s + (Number(d.planned_work_hours) || 0), 0);
    const totalTravel = dailies.reduce((s: number, d: any) => s + (Number(d.planned_travel_hours) || 0), 0);

    autoTable(doc, {
      startY: y,
      head: [['Datum', 'Montör', 'Företag', 'Arbetstid (h)', 'Restid (h)', 'Totalt (h)']],
      body: dailies.map((d: any) => {
        const w = Number(d.planned_work_hours) || 0;
        const t = Number(d.planned_travel_hours) || 0;
        return [
          fmtDate(d.date),
          d.installers?.name || '–',
          d.installers?.company || '–',
          w ? w.toString() : '–',
          t ? t.toString() : '–',
          (w + t).toString(),
        ];
      }),
      foot: [[
        'Summa', '', '',
        totalWork.toString(), totalTravel.toString(), (totalWork + totalTravel).toString(),
      ]],
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
      footStyles: { fillColor: BRAND.light, textColor: BRAND.dark, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: BRAND.rowAlt },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==== Uppföljning – KPI ====
  if (kpi && kpi.length) {
    y = sectionTitle(doc, y, 'Uppföljning – KPI');
    autoTable(doc, {
      startY: y,
      head: [['Datum', 'FTR %', 'Saknad lev.prec.', 'Besiktnings- anmärkningar', 'Avvikelser', 'Notering']],
      body: kpi.map((k: any) => [
        fmtDate(k.created_at),
        k.first_time_right_percent != null ? `${k.first_time_right_percent}%` : '–',
        k.delivery_precision_missing ?? '–',
        k.inspection_remarks ?? '–',
        k.deviations ?? '–',
        (k.notes || '').slice(0, 60),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
      alternateRowStyles: { fillColor: BRAND.rowAlt },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    const collect = (rows: any[], key: string) =>
      rows.flatMap((k) => (Array.isArray(k[key]) ? k[key].map((d: any) => ({ when: fmtDate(k.created_at), ...d })) : []));

    const detailBlock = (title: string, rows: any[]) => {
      if (!rows.length) return;
      y = sectionTitle(doc, y, title);
      autoTable(doc, {
        startY: y,
        head: [['Datum', 'Typ / Kategori', 'Beskrivning', 'Status/Åtgärd']],
        body: rows.map(r => [
          r.when || '–',
          r.type || r.category || r.article || '–',
          r.description || r.note || '–',
          r.status || r.action || r.resolved || '–',
        ]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: BRAND.dark, textColor: 255 },
        alternateRowStyles: { fillColor: BRAND.rowAlt },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    };

    detailBlock('Avvikelser – detaljer', collect(kpi as any[], 'deviation_details'));
    detailBlock('Besiktningsanmärkningar', collect(kpi as any[], 'inspection_remark_details'));
    detailBlock('Saknad leveransprecision – detaljer', collect(kpi as any[], 'missing_article_details'));
    detailBlock('First Time Right – detaljer', collect(kpi as any[], 'ftr_details'));
  }

  // ==== Dokumentationsplan ====
  if (docs && docs.length) {
    y = sectionTitle(doc, y, 'Dokumentationsplan');
    autoTable(doc, {
      startY: y,
      head: [['Dokumenttyp', 'Ansvarig', 'Status', 'Deadline', 'Inlämnad', 'Inlämnad till', 'Notering']],
      body: docs.map((d: any) => [
        d.document_type || '–',
        d.responsible || '–',
        d.status || '–',
        fmtDate(d.deadline),
        fmtDate(d.submitted_date),
        d.submitted_to || '–',
        (d.notes || '').slice(0, 40),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
      alternateRowStyles: { fillColor: BRAND.rowAlt },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==== ÄTA ====
  if (ataItems && ataItems.length) {
    y = sectionTitle(doc, y, 'ÄTA – Ändringar, Tillägg, Avgående');
    autoTable(doc, {
      startY: y,
      head: [['Datum', 'Titel', 'Typ', 'Status', 'Timmar', 'Material', 'Belopp']],
      body: ataItems.map((a: any) => [
        fmtDate(a.date),
        (a.title || '–').slice(0, 40),
        a.ata_type || '–',
        a.status || '–',
        a.hours ?? '–',
        a.material_cost != null ? `${a.material_cost} kr` : '–',
        a.amount != null ? `${a.amount} kr` : '–',
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
      alternateRowStyles: { fillColor: BRAND.rowAlt },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    const withDesc = (ataItems as any[]).filter(a => a.description);
    if (withDesc.length) {
      y = sectionTitle(doc, y, 'ÄTA – Beskrivningar');
      autoTable(doc, {
        startY: y,
        head: [['Datum', 'Titel', 'Beskrivning']],
        body: withDesc.map((a: any) => [fmtDate(a.date), a.title || '–', a.description]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: BRAND.dark, textColor: 255 },
        alternateRowStyles: { fillColor: BRAND.rowAlt },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ==== Footer ====
  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.dark);
    doc.text(`Sida ${i} av ${total}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    doc.text(`${project.code} – ${project.name}`, 14, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`Projektrapport-${project.code}-${project.name}.pdf`);
}
