import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/data/projectData';

const BRAND = { primary: [28, 127, 114] as [number, number, number], dark: [24, 50, 58] as [number, number, number] };

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

export async function generateProjectReport(project: Project): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // ==== Cover / Header ====
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

  // ==== Aktiviteter / Gantt-underlag ====
  y = sectionTitle(doc, y, 'Aktiviteter & Ganttschema');
  autoTable(doc, {
    startY: y,
    head: [['Aktivitet', 'Avdelning', 'Ansvarig', 'Status', 'Start', 'Slut', 'Dagar']],
    body: (project.activities || []).map((a) => [
      a.name, a.department || '–', a.responsible || '–', a.status || '–',
      fmtDate(a.startDate), fmtDate(a.endDate), a.days?.toString() || '–',
    ]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: BRAND.dark, textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 245] },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ==== Uppföljning – KPI + Avvikelser ====
  const { data: kpi } = await supabase
    .from('project_kpi_metrics')
    .select('*')
    .eq('project_id', project.id)
    .order('week_number', { ascending: true });

  if (kpi && kpi.length) {
    y = sectionTitle(doc, y, 'Uppföljning – KPI per vecka');
    autoTable(doc, {
      startY: y,
      head: [['Vecka', 'År', 'Kalkyl h', 'Utfall h', 'Avvikelse %', 'Avvikelser', 'Anteckning']],
      body: kpi.map((k: any) => [
        k.week_number, k.year,
        k.calculated_hours ?? '–', k.actual_hours ?? '–',
        k.deviation_percent != null ? `${k.deviation_percent}%` : '–',
        k.deviations ?? '–',
        (k.notes || '').slice(0, 60),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Deviation details
    const devRows: any[] = [];
    for (const k of kpi as any[]) {
      const details = Array.isArray(k.deviation_details) ? k.deviation_details : [];
      for (const d of details) {
        devRows.push([`v.${k.week_number}/${k.year}`, d.type || '–', d.description || '–']);
      }
    }
    if (devRows.length) {
      y = sectionTitle(doc, y, 'Avvikelser – beskrivningar');
      autoTable(doc, {
        startY: y,
        head: [['Vecka', 'Typ', 'Beskrivning']],
        body: devRows,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: BRAND.dark, textColor: 255 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ==== Resursplan – installatörer + allokeringar ====
  const [{ data: allocs }, { data: dailies }] = await Promise.all([
    supabase.from('project_resource_allocations').select('*, installers(name)').eq('project_id', project.id),
    supabase.from('daily_resource_entries').select('*, installers(name)').eq('project_id', project.id).order('date'),
  ]);

  if (allocs && allocs.length) {
    y = sectionTitle(doc, y, 'Resursplan – allokeringar');
    autoTable(doc, {
      startY: y,
      head: [['Montör', 'Från', 'Till', 'Roll', 'Timmar/dag']],
      body: allocs.map((a: any) => [
        a.installers?.name || 'Vakant', fmtDate(a.start_date), fmtDate(a.end_date),
        a.role || '–', a.hours_per_day ?? '–',
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (dailies && dailies.length) {
    y = sectionTitle(doc, y, 'Resursplan – dagsutfall');
    autoTable(doc, {
      startY: y,
      head: [['Datum', 'Montör', 'Timmar', 'Restimmar', 'Notering']],
      body: dailies.map((d: any) => [
        fmtDate(d.date), d.installers?.name || '–',
        d.hours ?? '–', d.travel_hours ?? '–', (d.notes || '').slice(0, 50),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==== Dokumentationsplan ====
  const { data: docs } = await supabase
    .from('documentation_items')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at');

  if (docs && docs.length) {
    y = sectionTitle(doc, y, 'Dokumentationsplan');
    autoTable(doc, {
      startY: y,
      head: [['Dokument', 'Ansvarig', 'Status', 'Deadline', 'Levererad']],
      body: docs.map((d: any) => [
        d.name || d.title || '–', d.responsible || '–', d.status || '–',
        fmtDate(d.deadline || d.due_date), d.delivered ? 'Ja' : 'Nej',
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==== ÄTA ====
  const { data: ataItems } = await supabase
    .from('ata_items')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at');

  if (ataItems && ataItems.length) {
    y = sectionTitle(doc, y, 'ÄTA – Ändringar, Tillägg, Avgående');
    autoTable(doc, {
      startY: y,
      head: [['Nr', 'Beskrivning', 'Typ', 'Status', 'Belopp', 'Datum']],
      body: ataItems.map((a: any) => [
        a.ata_number || a.number || '–',
        (a.description || a.name || '–').slice(0, 60),
        a.type || '–', a.status || '–',
        a.amount != null ? `${a.amount} kr` : '–',
        fmtDate(a.date || a.created_at),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: BRAND.dark, textColor: 255 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ==== Footer: page numbers ====
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
