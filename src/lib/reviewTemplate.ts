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

const DOC_TYPES = [
  'Offert', 'Reviderad offert', 'Order', 'Kontrakt', 'Allmänna villkor',
  'Administrativa föreskrifter', 'Tekniska beskrivningar', 'Ritningar',
  'Konstruktionsritningar', 'Arkitektritningar', 'DWG', 'PDF', 'IFC/BIM', 'Bilder',
  'Inmätningsunderlag', 'Geotekniskt underlag', 'Elunderlag', 'VVS-underlag',
  'Brandhandlingar', 'Akustikhandlingar', 'Montagehandlingar', 'Produktionsunderlag',
  'Kundens kravspecifikation', 'Övriga bilagor',
];

const SCOPE_CATEGORIES = [
  'Huvudleverans', 'Konstruktion', 'Material', 'Produktion', 'Montage', 'Installation',
  'Projektering', 'Transport', 'Etablering', 'Inmätning', 'Dokumentation',
  'Relationshandlingar', 'Besiktning', 'Provning', 'Utbildning', 'Service',
  'Garantiåtaganden', 'Övrigt',
];

const BOUNDARY_AREAS = [
  'Projektering', 'Konstruktion', 'Mark', 'El', 'VVS', 'Brand', 'Montage', 'Bygg',
  'Rivning', 'Inmätning', 'Transport', 'Lossning', 'Lyft', 'Etablering', 'Ställning',
  'Dokumentation', 'Besiktning', 'Myndighetskontakter',
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

export const DEFAULT_REVIEW_TEMPLATE: ReviewTemplate = {
  name: 'Standardmall – Projektgenomgång',
  projectType: 'Standardprojekt',
  version: 1,
  sections: [
    {
      key: 'basics',
      title: 'Grundinformation',
      kind: 'fields',
      countsTowardProgress: true,
      description: 'Projektets grunddata. Fält märkta med projektikon hämtas från projektdatan.',
      fields: [
        { key: 'customer', label: 'Kund', type: 'text', autoFrom: 'customer', required: true },
        { key: 'end_customer', label: 'Slutkund', type: 'text' },
        { key: 'project_name', label: 'Projektets namn', type: 'text', autoFrom: 'name', required: true },
        { key: 'project_address', label: 'Projektadress', type: 'text', autoFrom: 'address' },
        { key: 'project_number', label: 'Projektnummer', type: 'text', autoFrom: 'code', required: true },
        { key: 'order_number', label: 'Ordernummer', type: 'text' },
        { key: 'sales_person', label: 'Säljare', type: 'person', autoFrom: 'salesPerson', required: true },
        { key: 'project_manager', label: 'Projektledare', type: 'person', autoFrom: 'projectManager', required: true },
        { key: 'design_lead', label: 'Konstruktionsansvarig', type: 'person', required: true },
        { key: 'production_lead', label: 'Produktionsansvarig', type: 'person' },
        { key: 'assembly_lead', label: 'Montageansvarig', type: 'person' },
        { key: 'contract_form', label: 'Kontraktsform', type: 'select', options: ['AB 04', 'ABT 06', 'ABM 07', 'Köpavtal', 'Order/offert', 'Annan'] },
        { key: 'contract_date', label: 'Kontrakts-/orderdatum', type: 'date' },
        { key: 'contract_sum', label: 'Kontraktssumma', type: 'number' },
        { key: 'currency', label: 'Valuta', type: 'select', options: ['SEK', 'EUR', 'NOK', 'DKK', 'USD'] },
        { key: 'design_start', label: 'Planerad projekteringsstart', type: 'date' },
        { key: 'production_start', label: 'Planerad produktionsstart', type: 'date' },
        { key: 'assembly_start', label: 'Planerad montage-/byggstart', type: 'date' },
        { key: 'completion_date', label: 'Färdigdatum', type: 'date' },
        { key: 'final_inspection', label: 'Slutbesiktning', type: 'date' },
        { key: 'warranty_period', label: 'Garantitid', type: 'text' },
        { key: 'other_dates', label: 'Övriga viktiga datum', type: 'textarea' },
      ],
    },
    {
      key: 'attendees',
      title: 'Närvarande',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till deltagare',
      description: 'Deltagare i genomgången. Datum och tid sparas automatiskt.',
      columns: [
        { key: 'name', label: 'Namn', type: 'person', required: true },
        { key: 'role', label: 'Roll', type: 'select', options: ['Säljare', 'Konstruktionschef', 'Projektledare', 'Konstruktör', 'Produktion', 'Montage', 'Inköp', 'Ekonomi', 'Annan'] },
        { key: 'department', label: 'Avdelning', type: 'text' },
        { key: 'present', label: 'Närvarande', type: 'yesno' },
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
      description: 'Vilka handlingar har faktiskt legat till grund för vår kalkyl och försäljning? Markera kontrakts-/ordergrundande handlingar.',
      columns: [
        { key: 'doc_type', label: 'Dokumenttyp', type: 'select', options: DOC_TYPES, required: true },
        { key: 'doc_name', label: 'Dokumentnamn', type: 'text', required: true },
        { key: 'doc_number', label: 'Dokumentnummer', type: 'text' },
        { key: 'revision', label: 'Revision', type: 'text' },
        { key: 'doc_date', label: 'Datum', type: 'date' },
        { key: 'source', label: 'Källa', type: 'select', options: ['Kund', 'Konsult', 'Internt', 'Arkitekt', 'Entreprenör', 'Annan'] },
        { key: 'contract_basis', label: 'Kontraktsgrundande', type: 'yesno' },
        { key: 'calc_basis', label: 'Grund för kalkyl/försäljning', type: 'yesno' },
        { key: 'uploaded', label: 'Uppladdad', type: 'yesno' },
        { key: 'reviewed', label: 'Granskad', type: 'yesno' },
        { key: 'reviewed_by', label: 'Granskad av', type: 'person' },
        { key: 'reviewed_date', label: 'Granskningsdatum', type: 'date' },
        { key: 'deviation', label: 'Avvikelse identifierad', type: 'yesno' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
      ],
    },
    {
      key: 'contract',
      title: 'Avtal & ekonomi',
      kind: 'checklist',
      countsTowardProgress: true,
      description: 'Genomgång av kontrakt, kommersiella villkor och ekonomiska risker.',
      fields: [
        q('signed_contract', 'Är signerat kontrakt mottaget?', 'yesno', { required: true }),
        q('contract_form_q', 'Vilken kontraktsform gäller?', 'text'),
        q('contract_docs', 'Vilka dokument är kontraktshandlingar?', 'textarea'),
        q('doc_ranking', 'Vilken rangordning gäller mellan handlingarna?', 'textarea'),
        q('special_terms', 'Finns särskilda avtalsvillkor?', 'yesnona'),
        q('deviating_terms', 'Finns avvikelser från våra standardvillkor?', 'yesnona'),
        q('verbal_agreements', 'Finns muntliga överenskommelser?', 'yesnona'),
        q('quote_reservations', 'Finns reservationer i offerten?', 'yesnona'),
        q('scope_exceptions', 'Finns undantag från vår normala omfattning?', 'yesnona'),
        q('contract_sum_eco', 'Kontraktssumma', 'number'),
        q('calc_sum', 'Kalkylsumma', 'number'),
        q('margin', 'Täckningsbidrag', 'text'),
        q('payment_plan', 'Betalningsplan', 'textarea'),
        q('advance', 'Förskott', 'text'),
        q('invoice_plan', 'Faktureringsplan', 'textarea'),
        q('index', 'Indexreglering', 'yesnona'),
        q('currency_eco', 'Valuta', 'text'),
        q('guarantees', 'Garantier', 'text'),
        q('securities', 'Säkerheter', 'text'),
        q('penalty', 'Vite', 'text'),
        q('bonus_malus', 'Bonus/malus', 'text'),
        q('delay_claims', 'Förseningskrav', 'text'),
        q('warranty_claims', 'Garantikrav', 'text'),
        q('insurance', 'Försäkringskrav', 'text'),
        q('commercial_risk', 'Finns det något i avtalet som avviker från vår normala affär eller innebär särskild ekonomisk/juridisk risk?', 'yesno', { required: true }),
      ],
    },
    {
      key: 'scope',
      title: 'Såld omfattning',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till omfattningspunkt',
      description: 'Dokumentera exakt vad kunden har köpt. Allt som är "Ingår ej" listas separat i sammanfattningen, allt "Oklart" hamnar i öppna punkter.',
      columns: [
        { key: 'category', label: 'Kategori', type: 'select', options: SCOPE_CATEGORIES, required: true },
        { key: 'included', label: 'Status', type: 'scope', required: true },
        { key: 'description', label: 'Beskrivning', type: 'textarea' },
        { key: 'doc_ref', label: 'Hänvisning till handling', type: 'text' },
        { key: 'revision', label: 'Dokument/revision', type: 'text' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
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
        { key: 'impact_design', label: 'Påverkan konstruktion', type: 'text' },
        { key: 'impact_production', label: 'Påverkan produktion', type: 'text' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'status', label: 'Status', type: 'select', options: ['Ej beställd', 'Offererad', 'Beställd', 'Avböjd', 'Utgången'] },
      ],
    },
    {
      key: 'requirements',
      title: 'Ska-krav / Kundkrav',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till krav',
      description: 'Krav utan ansvarig eller verifieringsmetod flaggas automatiskt.',
      columns: [
        { key: 'requirement', label: 'Krav', type: 'textarea', required: true },
        { key: 'source', label: 'Källa', type: 'select', options: SOURCES, required: true },
        { key: 'document', label: 'Dokument', type: 'text' },
        { key: 'page', label: 'Sida/avsnitt', type: 'text' },
        { key: 'revision', label: 'Revision', type: 'text' },
        { key: 'mandatory', label: 'Obligatoriskt', type: 'yesno' },
        { key: 'fulfilled', label: 'Uppfylls', type: 'select', options: ['Ja', 'Nej', 'Delvis', 'Okänt'] },
        { key: 'how', label: 'Hur kravet uppfylls', type: 'textarea' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'verification', label: 'Verifieringsmetod', type: 'text' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        { key: 'risk', label: 'Risk vid ej uppfyllt', type: 'text' },
      ],
    },
    {
      key: 'technical',
      title: 'Teknisk specifikation',
      kind: 'checklist',
      countsTowardProgress: true,
      description: 'Teknisk genomgång med spårbarhet till underlag.',
      fields: [
        q('geo_measures', 'Mått', 'text'), q('geo_tolerances', 'Toleranser', 'text'),
        q('geo_cc', 'CC-mått', 'text'), q('geo_heights', 'Höjder', 'text'),
        q('geo_levels', 'Nivåer', 'text'), q('geo_survey', 'Inmätning', 'yesnona'),
        q('geo_existing', 'Befintliga förhållanden', 'textarea'),
        q('mat_material', 'Material', 'text'), q('mat_brand', 'Fabrikat', 'text'),
        q('mat_model', 'Modell', 'text'), q('mat_quality', 'Kvalitet', 'text'),
        q('mat_dimensions', 'Dimensioner', 'text'), q('mat_surface', 'Ytbehandling', 'text'),
        q('mat_colors', 'Kulörer', 'text'), q('mat_laminate', 'Laminat', 'text'),
        q('mat_fabric', 'Tyg', 'text'), q('mat_special', 'Specialmaterial', 'text'),
        q('con_type', 'Konstruktionstyp', 'text'), q('con_fixings', 'Infästningar', 'text'),
        q('con_weld_class', 'Svetsklasser', 'text'), q('con_bolts', 'Skruvförband', 'text'),
        q('con_quality_class', 'Kvalitetsklasser', 'text'), q('con_pulltest', 'Dragprov', 'yesnona'),
        q('con_testing', 'Provning', 'yesnona'), q('con_dimensioning', 'Dimensioneringskrav', 'text'),
        q('con_tolerances', 'Toleranser (konstruktion)', 'text'),
        q('fun_fixed', 'Fasta funktioner', 'text'), q('fun_removable', 'Löstagbara', 'text'),
        q('fun_folding', 'Fällbara', 'text'), q('fun_adjustable', 'Justerbara', 'text'),
        q('fun_motorized', 'Motoriserade', 'text'), q('fun_special', 'Specialfunktioner', 'text'),
        q('doc_assembly', 'Monteringsinstruktion', 'yesnona'), q('doc_asbuilt', 'Relationshandlingar', 'yesnona'),
        q('doc_drawings', 'Ritningar', 'yesnona'), q('doc_dwg', 'DWG', 'yesnona'),
        q('doc_pdf', 'PDF', 'yesnona'), q('doc_bim', 'BIM/IFC', 'yesnona'),
        q('doc_ce', 'CE-dokumentation', 'yesnona'), q('doc_controlplan', 'Kontrollplan', 'yesnona'),
        q('doc_testprotocol', 'Provningsprotokoll', 'yesnona'),
      ],
    },
    {
      key: 'product',
      title: 'Projektspecifik produktgenomgång',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till produktpunkt',
      description: 'Dynamiska produktkategorier, t.ex. läktare, räcken, gradänger. Skapa egna kategorier och fält efter projekttyp.',
      columns: [
        { key: 'category', label: 'Kategori', type: 'text', required: true },
        { key: 'attribute', label: 'Egenskap/fält', type: 'text', required: true },
        { key: 'value', label: 'Värde', type: 'text' },
        { key: 'source', label: 'Källa', type: 'select', options: SOURCES },
        { key: 'document', label: 'Dokument/revision', type: 'text' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
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
      ],
    },
    {
      key: 'boundaries',
      title: 'Gränsdragning',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till gränsdragning',
      description: 'Alla "Oklart" hamnar automatiskt i öppna punkter.',
      columns: [
        { key: 'area', label: 'Område', type: 'select', options: BOUNDARY_AREAS, required: true },
        { key: 'responsible_party', label: 'Ansvar', type: 'select', options: ['Vi', 'Kund', 'Annan part', 'Oklart'], required: true },
        { key: 'other_party', label: 'Annan part (namn)', type: 'text' },
        { key: 'comment', label: 'Kommentar', type: 'textarea' },
        { key: 'responsible', label: 'Ansvarig hos oss', type: 'person' },
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
      ],
    },
    {
      key: 'production',
      title: 'Produktion & montage',
      kind: 'checklist',
      countsTowardProgress: true,
      fields: [
        q('method', 'Produktionsmetod', 'text'), q('special_tools', 'Specialverktyg', 'text'),
        q('fixtures', 'Fixturer', 'text'), q('drill_templates', 'Borrmallar', 'text'),
        q('temp_aids', 'Temporära hjälpmedel', 'text'), q('assembly_aids', 'Montagehjälpmedel', 'text'),
        q('lifting', 'Lyft', 'text'), q('transport', 'Transport', 'text'),
        q('packaging', 'Emballage', 'text'), q('storage', 'Lagring', 'text'),
        q('site_setup', 'Etablering', 'text'), q('site_conditions', 'Arbetsplatsförutsättningar', 'textarea'),
        q('access', 'Tillträde', 'text'), q('working_hours', 'Arbetstider', 'text'),
        q('safety_req', 'Säkerhetskrav', 'text'), q('work_env_req', 'Arbetsmiljökrav', 'text'),
      ],
    },
    {
      key: 'workenv',
      title: 'Arbetsmiljö & säkerhet',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till risk/krav',
      columns: [
        { key: 'topic', label: 'Riskområde', type: 'select', required: true, options: ['Arbete på höjd', 'Lyft', 'Tunga moment', 'Trånga utrymmen', 'Risk för fall', 'Risk för klämning', 'Svetsning', 'Brandrisk', 'Tillstånd', 'Personlig skyddsutrustning', 'Kundens säkerhetsregler', 'Arbetsmiljöplan', 'Annat'] },
        { key: 'description', label: 'Beskrivning', type: 'textarea' },
        { key: 'action', label: 'Åtgärd', type: 'textarea' },
        { key: 'responsible', label: 'Ansvarig', type: 'person', required: true },
        { key: 'deadline', label: 'Deadline', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['Öppen', 'Pågår', 'Klar'] },
      ],
    },
    {
      key: 'quality',
      title: 'Kvalitet & kontroll',
      kind: 'checklist',
      countsTowardProgress: true,
      fields: [
        q('quality_req', 'Kvalitetskrav', 'textarea'), q('control_plan', 'Kontrollplan', 'yesnona'),
        q('control_points', 'Kontrollpunkter', 'textarea'), q('material_certs', 'Materialcertifikat', 'yesnona'),
        q('weld_docs', 'Svetsdokumentation', 'yesnona'), q('weld_classes', 'Svetsklasser', 'text'),
        q('pull_tests', 'Dragprov', 'yesnona'), q('trial_assembly', 'Provmontering', 'yesnona'),
        q('prototype', 'Provstol/prototyp', 'yesnona'), q('factory_control', 'Fabrikskontroll', 'yesnona'),
        q('assembly_control', 'Montagekontroll', 'yesnona'), q('self_checks', 'Egenkontroller', 'yesnona'),
        q('inspection', 'Besiktning', 'yesnona'), q('doc_requirements', 'Dokumentationskrav', 'textarea'),
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
      ],
    },
    {
      key: 'communication',
      title: 'Kommunikation & dokumentflöde',
      kind: 'checklist',
      countsTowardProgress: true,
      fields: [
        q('platform', 'Kommunikationsplattform', 'select', { options: ['iBinder', 'Yolean', 'ACC', 'SharePoint', 'E-post', 'Annat'] }),
        q('customer_contact', 'Vem kommunicerar med kunden?', 'person'),
        q('approves_changes', 'Vem godkänner tekniska ändringar?', 'person'),
        q('orders_ata', 'Vem får beställa ÄTA?', 'person'),
        q('decision_maker', 'Vem får fatta beslut?', 'person'),
        q('change_documentation', 'Hur ska ändringar dokumenteras?', 'textarea'),
        q('revision_handling', 'Hur hanteras reviderade handlingar?', 'textarea'),
      ],
    },
    {
      key: 'risks',
      title: 'Risker',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till risk',
      description: 'Riskvärde = sannolikhet × konsekvens. Färg sätts automatiskt.',
      columns: [
        { key: 'risk', label: 'Risk', type: 'textarea', required: true },
        { key: 'source', label: 'Källa', type: 'select', options: SOURCES },
        { key: 'probability', label: 'Sannolikhet 1–5', type: 'select', options: ['1', '2', '3', '4', '5'], required: true },
        { key: 'consequence', label: 'Konsekvens 1–5', type: 'select', options: ['1', '2', '3', '4', '5'], required: true },
        { key: 'preventive', label: 'Förebyggande åtgärd', type: 'textarea' },
        { key: 'mitigation', label: 'Konsekvensåtgärd', type: 'textarea' },
        { key: 'responsible', label: 'Ansvarig', type: 'person', required: true },
        { key: 'deadline', label: 'Deadline', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['Öppen', 'Pågår', 'Hanterad', 'Stängd'] },
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
        { key: 'documentation', label: 'Dokumentation', type: 'text' },
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
        { key: 'by_whom', label: 'Av vem?', type: 'person' },
        { key: 'to_whom', label: 'Till vem?', type: 'text' },
        { key: 'date', label: 'Datum', type: 'date' },
        { key: 'written_confirmation', label: 'Finns skriftlig bekräftelse?', type: 'yesno' },
        { key: 'affects_scope', label: 'Påverkar omfattning?', type: 'yesno' },
        { key: 'affects_price', label: 'Påverkar pris?', type: 'yesno' },
        { key: 'affects_schedule', label: 'Påverkar tidplan?', type: 'yesno' },
        { key: 'to_be_confirmed', label: 'Ska dokumenteras/bekräftas?', type: 'yesno' },
        { key: 'responsible', label: 'Ansvarig', type: 'person' },
      ],
    },
    {
      key: 'open_points',
      title: 'Öppna punkter',
      kind: 'table',
      countsTowardProgress: true,
      addLabel: 'Lägg till punkt',
      description: 'Punkter från hela genomgången som är oklara samlas här automatiskt. En punkt kan inte markeras "Klar" utan ansvarig.',
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
        { key: 'affects_design', label: 'Konstruktion påverkas?', type: 'yesno' },
        { key: 'affects_production', label: 'Produktion påverkas?', type: 'yesno' },
        { key: 'doc_updated', label: 'Dokumentation uppdaterad?', type: 'yesno' },
        { key: 'ata_required', label: 'ÄTA krävs?', type: 'yesno' },
        { key: 'approved_by', label: 'Godkänd av', type: 'person' },
        { key: 'date', label: 'Datum', type: 'date' },
      ],
    },
  ],
};

export const SIGNOFF_ROLES: { role: string; statement: string }[] = [
  { role: 'Säljare', statement: 'Jag intygar att projektets sålda omfattning, kommersiella villkor och kundens krav har gåtts igenom.' },
  { role: 'Konstruktionschef', statement: 'Jag intygar att tekniska förutsättningar, handlingar och konstruktionsrelaterade frågor har gåtts igenom.' },
  { role: 'Projektledare', statement: 'Jag intygar att projektet är tillräckligt dokumenterat för att gå vidare till projektgenomförande.' },
];

export function riskLevel(p?: string, c?: string): { value: number; level: string } {
  const v = (Number(p) || 0) * (Number(c) || 0);
  if (v === 0) return { value: 0, level: 'Ej bedömd' };
  if (v <= 4) return { value: v, level: 'Låg' };
  if (v <= 9) return { value: v, level: 'Måttlig' };
  if (v <= 14) return { value: v, level: 'Hög' };
  return { value: v, level: 'Kritisk' };
}
