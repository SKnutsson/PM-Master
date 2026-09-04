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
  | 'status';

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


const TIMELINE_ACTIVITIES = [
  'Projekteringsstart', 'Konstruktionsstart', 'Kundgranskning', 'Bygghandling klar',
  'Produktionsstart', 'Inköpsdeadline', 'Leveransdatum', 'Montagestart', 'Delmål',
  'Färdigställande', 'Slutbesiktning', 'Garantibesiktning',
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
  { key: 'followup', label: 'Kräver uppföljning', type: 'yesno' },
  { key: 'followup_note', label: 'Uppföljning – vad?', type: 'text' },
  { key: 'followup_responsible', label: 'Uppföljningsansvarig', type: 'person' },
  { key: 'followup_deadline', label: 'Uppföljning senast', type: 'date' },
];

export const DEFAULT_REVIEW_TEMPLATE: ReviewTemplate = {
  name: 'Standardmall – Projektgenomgång',
  projectType: 'Standardprojekt',
  version: 3,
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
        { key: 'number', label: 'Optionsnummer', type: 'text', required: true },
        { key: 'description', label: 'Beskrivning', type: 'textarea', required: true },
        { key: 'price', label: 'Pris', type: 'number' },
        { key: 'in_order', label: 'Ingår i order', type: 'yesno' },
        { key: 'precondition', label: 'Förutsättning', type: 'text' },
        { key: 'decision_deadline', label: 'Beslut senast', type: 'date' },
        { key: 'impact_schedule', label: 'Påverkan tidplan', type: 'text' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'status', label: 'Status', type: 'select', options: ['Ej beställd', 'Offererad', 'Beställd', 'Avböjd', 'Utgången'] },
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
        { key: 'requirement', label: 'Krav', type: 'textarea', required: true },
        { key: 'source', label: 'Källa', type: 'select', options: SOURCES },
        { key: 'document', label: 'Dokument', type: 'text' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'technical',
      title: 'Teknisk specifikation',
      kind: 'checklist',
      countsTowardProgress: true,
      hideTraceability: true,
      description: 'Teknisk genomgång av projektets förutsättningar.',
      fields: [
        q('geo_measures', 'Mått', 'text'), q('geo_tolerances', 'Toleranser', 'text'),
        q('geo_cc', 'CC-mått', 'text'), q('geo_heights', 'Höjder', 'text'),
        q('geo_levels', 'Nivåer', 'text'), q('geo_survey', 'Inmätning', 'yesnona'),
        q('geo_existing', 'Befintliga förhållanden', 'textarea'),
        q('mat_colors', 'Kulörer', 'text'), q('mat_laminate', 'Laminat', 'text'),
        q('mat_fabric', 'Tyg', 'text'), q('mat_special', 'Specialmaterial', 'text'),
        q('con_weld_class', 'Svetsklasser', 'text'),
        q('con_quality_class', 'Kvalitetsklasser', 'text'), q('con_pulltest', 'Dragprov', 'yesnona'),
        q('con_testing', 'Provning', 'yesnona'), q('con_dimensioning', 'Dimensioneringskrav', 'text'),
        q('con_tolerances', 'Toleranser (konstruktion)', 'text'),
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
        { key: 'activity', label: 'Aktivitet', type: 'select', options: TIMELINE_ACTIVITIES, required: true },
        { key: 'date', label: 'Datum', type: 'date' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'status', label: 'Status', type: 'select', options: ['Ej påbörjad', 'Pågår', 'Klar', 'Försenad'] },
        { key: 'dependency', label: 'Beroende', type: 'text' },
        { key: 'critical', label: 'Kritisk', type: 'yesno' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'regulations',
      title: 'Regelverk',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till krav/regelverk',
      description: 'Ange endast de krav som faktiskt gäller för projektet och var kravet kommer ifrån.',
      columns: [
        { key: 'area', label: 'Område', type: 'select', options: ['Byggregler', 'Arbetsmiljökrav', 'Brandskydd', 'Tillgänglighet', 'Akustik', 'El', 'VVS', 'Miljökrav', 'CE/märkning', 'SS/EN-standard', 'Kundspecifik standard', 'Övrig föreskrift'], required: true },
        { key: 'requirement', label: 'Krav/standard', type: 'text', required: true },
        { key: 'source', label: 'Var kommer kravet ifrån?', type: 'select', options: SOURCES, required: true },
        { key: 'document', label: 'Dokument/avsnitt', type: 'text' },
        { key: 'applies', label: 'Gäller för projektet', type: 'yesnona' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'communication',
      title: 'Kommunikation & dokumentflöde',
      kind: 'checklist',
      countsTowardProgress: true,
      hideTraceability: true,
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
      key: 'verbal',
      title: 'Muntliga överenskommelser',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till överenskommelse',
      columns: [
        { key: 'what', label: 'Vad har kommunicerats?', type: 'textarea', required: true },
        { key: 'by_whom', label: 'Av vem?', type: 'text' },
        { key: 'to_whom', label: 'Till vem?', type: 'text' },
        { key: 'date', label: 'Datum', type: 'date' },
        { key: 'written_confirmation', label: 'Finns skriftlig bekräftelse?', type: 'yesno' },
        { key: 'affects_scope', label: 'Påverkar omfattning?', type: 'yesno' },
        { key: 'affects_price', label: 'Påverkar pris?', type: 'yesno' },
        { key: 'affects_schedule', label: 'Påverkar tidplan?', type: 'yesno' },
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
    {
      key: 'decisions',
      title: 'Beslut',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till beslut',
      columns: [
        { key: 'decision', label: 'Beslut', type: 'textarea', required: true },
        { key: 'date', label: 'Datum', type: 'date' },
        { key: 'participants', label: 'Deltagare', type: 'text' },
        { key: 'decision_maker', label: 'Beslutsfattare', type: 'person', required: true },
        { key: 'basis', label: 'Underlag', type: 'text' },
        { key: 'consequence', label: 'Konsekvens', type: 'textarea' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        ...FOLLOWUP,
      ],
    },
    {
      key: 'changes',
      title: 'Ändringar',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till ändring',
      columns: [
        { key: 'what', label: 'Vad ändras?', type: 'textarea', required: true },
        { key: 'original', label: 'Ursprunglig lösning', type: 'textarea' },
        { key: 'new', label: 'Ny lösning', type: 'textarea' },
        { key: 'reason', label: 'Orsak', type: 'textarea' },
        { key: 'initiator', label: 'Initierad av', type: 'select', options: ['Kund', 'Internt'] },
        { key: 'affects_price', label: 'Pris påverkas?', type: 'yesno' },
        { key: 'affects_schedule', label: 'Tidplan påverkas?', type: 'yesno' },
        { key: 'ata_required', label: 'ÄTA krävs?', type: 'yesno' },
        { key: 'approved_by', label: 'Godkänd av', type: 'person' },
        { key: 'date', label: 'Datum', type: 'date' },
        ...FOLLOWUP,
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
