/**
 * Mall-definition för Projektgenomgång (Project Handover / Contract & Technical Review).
 * Mallen är data-driven: sektioner, fält och kolumner definieras här och sparas som
 * snapshot per projektgenomgång (template_snapshot) så historiska genomgångar aldrig ändras
 * när mallen uppdateras.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'yesno'
  | 'yesnona'
  | 'person'
  | 'scope'
  | 'status'
  | 'checkbox'
  | 'attachment';

export interface ReviewField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  /** Fältet fylls automatiskt från projektdata (skrivskyddat förslag) */
  autoFrom?: 'code' | 'name' | 'customer' | 'address' | 'projectManager' | 'salesPerson' | 'product';
  help?: string;
  width?: number;
}

export interface ReviewSection {
  key: string;
  title: string;
  /** 'fields' = formulär, 'table' = repeterbara rader, 'checklist' = frågor med svar+källa */
  kind: 'fields' | 'table' | 'checklist';
  description?: string;
  fields?: ReviewField[];
  columns?: ReviewField[];
  addLabel?: string;
  /** Dölj spårbarhetsfälten (källa/dokument/rev/ansvarig) i checklistvyn */
  hideTraceability?: boolean;
  /** Sektioner som räknas in i "huvudområden genomgångna" */
  countsTowardProgress?: boolean;
  /** Visar uppföljning som en kryssruta i checklistvyn. */
  followupCheckbox?: boolean;
}

export interface ReviewTemplate {
  name: string;
  projectType: string;
  version: number;
  sections: ReviewSection[];
}

const SOURCES = [
  'Kontrakt', 'AF', 'Teknisk beskrivning', 'Ritning', 'Offert', 'Kundmail',
  'Mötesprotokoll', 'Muntlig överenskommelse', 'Standard', 'Myndighetskrav', 'Annat',
];


export const REVIEW_STATUSES = [
  'Ej påbörjad', 'Pågår', 'Väntar på komplettering', 'Klar för intern granskning',
  'Godkänd', 'Kräver åtgärd',
] as const;

export const OPEN_POINT_STATUSES = ['Öppen', 'Pågår', 'Väntar på kund', 'Väntar internt', 'Klar'] as const;

/** Checklistrad: fråga + svar + spårbarhet (källa → dokument → revision → sida → kommentar → ansvarig) */
function q(key: string, label: string, type: FieldType = 'yesnona', extra: Partial<ReviewField> = {}): ReviewField {
  return { key, label, type, ...extra };
}

/** Uppföljningskolumn som finns på alla tabellsektioner */
const FOLLOWUP: ReviewField[] = [
  { key: 'followup', label: 'Kräver uppföljning', type: 'checkbox' },
  { key: 'followup_note', label: 'Kommentar', type: 'text' },
  { key: 'followup_responsible', label: 'Ansvarig för uppföljning', type: 'person' },
];

/** Förifyllda punkter i Teknisk specifikation vid ny genomgång (kan tas bort/utökas) */
export const TECHNICAL_DEFAULT_CONDITIONS = [
  'Längd', 'Höjd', 'CC-mått', 'Rader', 'Inmätning', 'Kulörer', 'Tyg', 'Laminat', 'Golv',
];

export const DEFAULT_REVIEW_TEMPLATE: ReviewTemplate = {
  name: 'Standardmall – Projektgenomgång',
  projectType: 'Standardprojekt',
  version: 6,
  sections: [
    {
      key: 'attendees',
      title: 'Närvarande',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till deltagare',
      description: 'Alla som listas här har deltagit i genomgången.',
      columns: [
        { key: 'name', label: 'Namn', type: 'text', required: true },
        { key: 'role', label: 'Roll', type: 'text' },
      ],
      fields: [
        { key: 'external_attendees', label: 'Övriga deltagare / externa deltagare', type: 'textarea' },
      ],
    },
    {
      key: 'documents',
      title: 'Underlag och handlingar',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till handling',
      description: 'Handlingar som ligger till grund för projektet. Bocka av när samtliga närvarande gått igenom dokumentet.',
      columns: [
        { key: 'doc_name', label: 'Dokumentnamn', type: 'text', required: true },
        { key: 'doc_number', label: 'Dokumentnummer', type: 'text' },
        { key: 'doc_date', label: 'Datum', type: 'date' },
        { key: 'reviewed', label: 'Genomgången', type: 'yesno' },
        { key: 'attachment', label: 'Fil', type: 'attachment' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'options',
      title: 'Optioner',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till option',
      columns: [
        { key: 'option', label: 'Option', type: 'text', required: true },
        { key: 'description', label: 'Beskrivning', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['Ej beställd', 'Beställd'] },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'requirements',
      title: 'Ska-/Bör-krav och ingår ej',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till krav',
      description: 'Registrera ska-krav, bör-krav och sådant som ingår ej. Markera "Kräver uppföljning" om punkten ska hamna i öppna punkter.',
      columns: [
        { key: 'req_type', label: 'Typ av krav', type: 'select', options: ['Ska-krav', 'Bör-krav', 'Ingår ej'], required: true },
        { key: 'requirement', label: 'Kravbeskrivning', type: 'textarea', required: true },
        { key: 'document', label: 'Dokument', type: 'text' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'technical',
      title: 'Teknisk specifikation',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till förutsättning',
      description: 'Lägg till de tekniska förutsättningar som ska gås igenom i projektet.',
      columns: [
        { key: 'condition', label: 'Förutsättning', type: 'textarea', required: true },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'existing',
      title: 'Befintliga förhållanden',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till förhållande',
      columns: [
        { key: 'topic', label: 'Punkt', type: 'select', required: true, options: ['Typ av byggnad', 'Typ av lokal', 'Befintlig konstruktion', 'Golv', 'Väggar', 'Tak', 'Pelare', 'El', 'Vatten', 'Ventilation', 'Brand', 'Hörslingor', 'Belysning', 'Tillgänglighet', 'Inmätning', 'Fotodokumentation', 'Annat'] },
        { key: 'has_basis', label: 'Finns underlag?', type: 'yesno' },
        { key: 'basis_type', label: 'Underlagets typ', type: 'text' },
        { key: 'basis_date', label: 'Datum/revision', type: 'text' },
        { key: 'verified_onsite', label: 'Verifierat på plats?', type: 'yesno' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'timeline',
      title: 'Tidplan',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till aktivitet',
      description: 'Passerade datum som ej är klara markeras automatiskt som kritiska.',
      columns: [
        { key: 'activity', label: 'Aktivitet', type: 'text', required: true },
        { key: 'date', label: 'Datum', type: 'text' },
        { key: 'document', label: 'Hänvisat dokument', type: 'text' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        { key: 'followup', label: 'Kräver uppföljning', type: 'checkbox' },
      ],
    },
    {
      key: 'communication',
      title: 'Kommunikation & dokumentflöde',
      kind: 'checklist',
      countsTowardProgress: true,
      hideTraceability: true,
      followupCheckbox: true,
      description: 'Ange vilka kommunikationskanaler som gäller i projektet.',
      fields: [
        q('channels', 'Kommunikationskanaler', 'textarea'),
      ],
    },
    {
      key: 'deviations',
      title: 'Avvikelser mellan underlag',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till avvikelse',
      description: 'Exempel: Offert säger X, Kontrakt säger Y, Ritning säger Z → avvikelse identifierad.',
      columns: [
        { key: 'source1', label: 'Källa 1', type: 'select', options: SOURCES, required: true },
        { key: 'source1_says', label: 'Källa 1 säger', type: 'textarea' },
        { key: 'source2', label: 'Källa 2', type: 'select', options: SOURCES, required: true },
        { key: 'source2_says', label: 'Källa 2 säger', type: 'textarea' },
        { key: 'difference', label: 'Vad skiljer sig?', type: 'textarea', required: true },
        { key: 'valid', label: 'Vilket gäller?', type: 'text' },
        { key: 'decision', label: 'Beslut', type: 'textarea' },
        { key: 'decided_by', label: 'Beslutat av', type: 'person' },
        { key: 'date', label: 'Datum', type: 'date' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'open_points',
      title: 'Öppna punkter',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till punkt',
      description: 'Register över alla punkter som är oklara eller kräver uppföljning. Punkter från övriga avsnitt föreslås automatiskt. En punkt kan inte markeras "Klar" utan ansvarig.',
      columns: [
        { key: 'point', label: 'Punkt', type: 'textarea', required: true },
        { key: 'category', label: 'Kategori', type: 'text' },
        { key: 'source', label: 'Källa', type: 'text' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'deadline', label: 'Deadline', type: 'date' },
        { key: 'priority', label: 'Prioritet', type: 'select', options: ['Låg', 'Normal', 'Hög', 'Kritisk'] },
        { key: 'status', label: 'Status', type: 'select', options: [...OPEN_POINT_STATUSES] },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
      ],
    },
  ],
};

export const SIGNOFF_ROLE = 'Godkännande av projektgenomgång';
export const SIGNOFF_STATEMENT =
  'Samtliga närvarande intygar att alla förutsättningar, handlingar och frågor har gåtts igenom och att projektet kan gå vidare till projektgenomförande.';

export const SIGNOFF_ROLES: { role: string; statement: string }[] = [
  { role: SIGNOFF_ROLE, statement: SIGNOFF_STATEMENT },
];

export function riskLevel(p?: string, c?: string): { value: number; level: string } {
  const v = (Number(p) || 0) * (Number(c) || 0);
  if (v === 0) return { value: 0, level: 'Ej bedömd' };
  if (v <= 4) return { value: v, level: 'Låg' };
  if (v <= 9) return { value: v, level: 'Måttlig' };
  if (v <= 14) return { value: v, level: 'Hög' };
  return { value: v, level: 'Kritisk' };
}
