import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { Project, Activity } from '@/data/projectData';

const BRAND = {
  primary: [28, 127, 114] as [number, number, number],
  dark: [24, 50, 58] as [number, number, number],
  light: [146, 174, 157] as [number, number, number],
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  'Slutförd': [34, 139, 87],
  'Pågår': [230, 145, 40],
  'Ej påbörjad': [70, 130, 180],
  'Försenad': [200, 55, 55],
  'Förväntad': [120, 120, 200],
  'Risk för försening': [220, 100, 40],
};

const DEPT_COLORS: Record<string, [number, number, number]> = {
  'Sälj': [90, 155, 210],
  'Projektledare': [28, 127, 114],
  'Konstruktion': [140, 90, 190],
  'Beredning': [200, 145, 50],
  'Inköp': [90, 190, 170],
  'Produktion': [24, 50, 58],
  'Montageledare': [200, 90, 130],
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
  doc.setFillColor(...BRAND.dark);
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 17, y + 5.8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

/** Draw a compact Gantt "screenshot" directly into the PDF */
function drawGantt(doc: jsPDF, y: number, activities: Activity[]): number {
  const scheduled = activities.filter(a => a.startDate && a.endDate);
  if (!scheduled.length) return y;

  const pageW = doc.internal.pageSize.getWidth();
  const left = 14;
  const labelW = 55;
  const chartX = left + labelW;
  const chartW = pageW - 28 - labelW;
  const rowH = 5.2;

  // Time domain
  const starts = scheduled.map(a => new Date(a.startDate!).getTime());
  const ends = scheduled.map(a => new Date(a.endDate!).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(max - min, 24 * 3600 * 1000);
  const xFor = (t: number) => chartX + ((t - min) / span) * chartW;

  const totalH = scheduled.length * rowH + 18;
  y = ensureSpace(doc, y, totalH + 6);

  // Month grid + labels
  doc.setFontSize(7);
  doc.setTextColor(90);
  const startDate = new Date(min);
  const endDate = new Date(max);
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cursor.getTime() <= endDate.getTime()) {
    const x = xFor(cursor.getTime());
    if (x >= chartX && x <= chartX + chartW) {
      doc.setDrawColor(220);
      doc.line(x, y + 6, x, y + 10 + scheduled.length * rowH);
      doc.text(
        cursor.toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }),
        x + 1, y + 4,
      );
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Header baseline
  doc.setDrawColor(150);
  doc.line(chartX, y + 6, chartX + chartW, y + 6);

  // Rows
  let ry = y + 8;
  doc.setTextColor(0);
  scheduled.forEach((a) => {
    // Label
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const name = a.name.length > 32 ? a.name.slice(0, 30) + '…' : a.name;
    doc.text(name, left, ry + 3.4);

    // Bar
    const bx = xFor(new Date(a.startDate!).getTime());
    const bw = Math.max(xFor(new Date(a.endDate!).getTime()) - bx, 1);
    const c = a.isMilestone
      ? [180, 40, 40] as [number, number, number]
      : (STATUS_COLORS[a.status] || DEPT_COLORS[a.department] || BRAND.primary);
    doc.setFillColor(...c);
    if (a.isMilestone) {
      // diamond
      const mx = bx, my = ry + rowH / 2;
      doc.triangle(mx - 2, my, mx, my - 2, mx + 2, my, 'F');
      doc.triangle(mx - 2, my, mx, my + 2, mx + 2, my, 'F');
    } else {
      doc.roundedRect(bx, ry + 0.8, bw, rowH - 1.6, 0.6, 0.6, 'F');
    }
    // Responsible on bar
    if (bw > 14) {
      doc.setTextColor(255);
      doc.setFontSize(6.5);
      doc.text(a.responsible || '', bx + 1.2, ry + 3.4);
      doc.setTextColor(0);
    }
    ry += rowH;
  });

  // Legend
  ry += 3;
  doc.setFontSize(7);
  let lx = left;
  Object.entries(STATUS_COLORS).forEach(([k, c]) => {
    doc.setFillColor(...c);
    doc.rect(lx, ry, 3, 3, 'F');
    doc.setTextColor(60);
    doc.text(k, lx + 4, ry + 2.6);
    lx += doc.getTextWidth(k) + 10;
  });
  doc.setTextColor(0);
  return ry + 6;
}

/** Draw a resource-plan "screenshot": rows = installers, cols = weeks, filled by planned hours */
function drawResourcePlan(
  doc: jsPDF, y: number,
  allocs: Array<{ installer: string; start: string; end: string; hours?: number }>,
  dailies: Array<{ installer: string; date: string; hours: number; travel?: number }>,
): number {
  const installers = Array.from(new Set([
    ...allocs.map(a => a.installer),
    ...dailies.map(d => d.installer),
  ]));
  if (!installers.length) return y;

  const pageW = doc.internal.pageSize.getWidth();
  const left = 14;
  const labelW = 45;
  const chartX = left + labelW;
  const chartW = pageW - 28 - labelW;
  const rowH = 6;

  const allDates = [
    ...allocs.flatMap(a => [a.start, a.end]),
    ...dailies.map(d => d.date),
  ].filter(Boolean).map(d => new Date(d).getTime());
  if (!allDates.length) return y;
  const min = Math.min(...allDates);
  const max = Math.max(...allDates);
  const span = Math.max(max - min, 7 * 24 * 3600 * 1000);
  const xFor = (t: number) => chartX + ((t - min) / span) * chartW;

  const totalH = installers.length * rowH + 18;
  y = ensureSpace(doc, y, totalH + 6);

  // Month labels
  doc.setFontSize(7);
  doc.setTextColor(90);
  const c = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1);
  while (c.getTime() <= max) {
    const x = xFor(c.getTime());
    if (x >= chartX && x <= chartX + chartW) {
      doc.setDrawColor(220);
      doc.line(x, y + 6, x, y + 10 + installers.length * rowH);
      doc.text(c.toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }), x + 1, y + 4);
    }
    c.setMonth(c.getMonth() + 1);
  }
  doc.setDrawColor(150);
  doc.line(chartX, y + 6, chartX + chartW, y + 6);

  let ry = y + 8;
  doc.setTextColor(0);
  installers.forEach((name) => {
    doc.setFontSize(7.5);
    const display = name.length > 22 ? name.slice(0, 20) + '…' : name;
    doc.text(display, left, ry + 3.6);

    // Planned allocations (light green)
    allocs.filter(a => a.installer === name).forEach(a => {
      const bx = xFor(new Date(a.start).getTime());
      const bw = Math.max(xFor(new Date(a.end).getTime()) - bx, 1);
      doc.setFillColor(...BRAND.light);
      doc.rect(bx, ry + 1, bw, rowH - 2, 'F');
    });

    // Daily entries (dark green stripes intensity ~ hours)
    dailies.filter(d => d.installer === name).forEach(d => {
      const bx = xFor(new Date(d.date).getTime());
      const intensity = Math.min(1, (d.hours || 0) / 8);
      const [r, g, b] = BRAND.primary;
      doc.setFillColor(
        Math.round(255 - (255 - r) * intensity),
        Math.round(255 - (255 - g) * intensity),
        Math.round(255 - (255 - b) * intensity),
      );
      doc.rect(bx, ry + 1, Math.max(chartW / Math.max((max - min) / 86400000, 1), 0.6), rowH - 2, 'F');
      if (d.travel) {
        doc.setFillColor(230, 145, 40);
        doc.rect(bx, ry + rowH - 1.4, Math.max(chartW / Math.max((max - min) / 86400000, 1), 0.6), 0.8, 'F');
      }
    });

    ry += rowH;
  });

  // Legend
  ry += 3;
  doc.setFontSize(7);
  const legend: Array<[string, [number, number, number]]> = [
    ['Planerad allokering', BRAND.light],
    ['Utfall (arbete)', BRAND.primary],
    ['Restimmar', [230, 145, 40]],
  ];
  let lx = left;
  legend.forEach(([k, col]) => {
    doc.setFillColor(...col);
    doc.rect(lx, ry, 3, 3, 'F');
    doc.setTextColor(60);
    doc.text(k, lx + 4, ry + 2.6);
    lx += doc.getTextWidth(k) + 10;
  });
  doc.setTextColor(0);
  return ry + 6;
}

export async function generateProjectReport(project: Project): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // ==== Header ====
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Projektrapport', 14, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${project.code} – ${project.name}`, 14, 23);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(`Genererad ${new Date().toLocaleString('sv-SE')}`, pageW - 14, 15, { align: 'right' });

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
      0: { fontStyle: 'bold', cellWidth: 32 },
      2: { fontStyle: 'bold', cellWidth: 32 },
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

  // ==== Gantt visual ====
  y = sectionTitle(doc, y, 'Ganttschema – visuell översikt');
  y = drawGantt(doc, y, project.activities || []);

  // ==== Aktivitetstabell ====
  y = sectionTitle(doc, y, 'Aktiviteter (detaljerat)');
  autoTable(doc, {
    startY: y,
    head: [['Aktivitet', 'Avdelning', 'Ansvarig', 'Status', 'Start', 'Slut', 'Dagar']],
    body: (project.activities || []).map((a) => [
      a.name + (a.isMilestone ? ' ★' : ''),
      a.department || '–', a.responsible || '–', a.status || '–',
      fmtDate(a.startDate), fmtDate(a.endDate), a.days?.toString() || '–',
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 245] },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ==== Fetch remaining data ====
  const [
    { data: kpi },
    { data: allocs },
    { data: dailies },
    { data: docs },
    { data: ataItems },
  ] = await Promise.all([
    supabase.from('project_kpi_metrics').select('*').eq('project_id', project.id).order('created_at'),
    supabase.from('project_resource_allocations').select('*, installers(name)').eq('project_id', project.id),
    supabase.from('daily_resource_entries').select('*, installers(name)').eq('project_id', project.id).order('date'),
    supabase.from('documentation_items').select('*').eq('project_id', project.id).order('sort_order'),
    supabase.from('ata_items').select('*').eq('project_id', project.id).order('date'),
  ]);

  // ==== Resource plan visual ====
  const allocList = (allocs || []).map((a: any) => ({
    installer: a.installers?.name || 'Vakant',
    start: a.start_date, end: a.end_date, hours: a.planned_hours,
  }));
  const dailyList = (dailies || []).map((d: any) => ({
    installer: d.installers?.name || 'Vakant',
    date: d.date,
    hours: Number(d.planned_work_hours) || 0,
    travel: Number(d.planned_travel_hours) || 0,
  }));
  if (allocList.length || dailyList.length) {
    y = sectionTitle(doc, y, 'Resursplanering – visuell översikt');
    y = drawResourcePlan(doc, y, allocList, dailyList);
  }

  // ==== Resursplan tabell ====
  if (allocList.length) {
    y = sectionTitle(doc, y, 'Resursplan – allokeringar');
    autoTable(doc, {
      startY: y,
      head: [['Montör', 'Från', 'Till', 'Planerade timmar']],
      body: allocList.map(a => [a.installer, fmtDate(a.start), fmtDate(a.end), a.hours ?? '–']),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==== Uppföljning – KPI + Avvikelser ====
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
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Collect detail arrays
    const collect = (rows: any[], key: string) =>
      rows.flatMap((k) => (Array.isArray(k[key]) ? k[key].map((d: any) => ({ when: fmtDate(k.created_at), ...d })) : []));

    const devs = collect(kpi as any[], 'deviation_details');
    const insp = collect(kpi as any[], 'inspection_remark_details');
    const missing = collect(kpi as any[], 'missing_article_details');
    const ftr = collect(kpi as any[], 'ftr_details');

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
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    };

    detailBlock('Avvikelser – detaljer', devs);
    detailBlock('Besiktningsanmärkningar', insp);
    detailBlock('Saknad leveransprecision – detaljer', missing);
    detailBlock('First Time Right – detaljer', ftr);
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
      alternateRowStyles: { fillColor: [245, 247, 245] },
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
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Descriptions
    const withDesc = (ataItems as any[]).filter(a => a.description);
    if (withDesc.length) {
      y = sectionTitle(doc, y, 'ÄTA – Beskrivningar');
      autoTable(doc, {
        startY: y,
        head: [['Datum', 'Titel', 'Beskrivning']],
        body: withDesc.map((a: any) => [fmtDate(a.date), a.title || '–', a.description]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: BRAND.dark, textColor: 255 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ==== Footer ====
  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Sida ${i} av ${total}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    doc.text(`${project.code} – ${project.name}`, 14, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`Projektrapport-${project.code}-${project.name}.pdf`);
}
