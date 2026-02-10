export type Status = 'Ej påbörjad' | 'Pågår' | 'Slutförd' | 'Försenad';
export type Department = 'Sälj' | 'Projektledare' | 'Konstruktion' | 'Beredning' | 'Inköp' | 'Produktion' | 'Montageledare';

export interface Activity {
  id: string;
  name: string;
  status: Status;
  department: Department;
  responsible: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  hasWarning?: boolean;
}

export type ProjectStatus = 'Aktiv' | 'Avslutat';

export interface Project {
  id: string;
  code: string;
  name: string;
  status?: ProjectStatus;
  activities: Activity[];
}

export interface SalesForecast {
  project: string;
  product: string;
  months: { [key: string]: number };
  notes?: string;
}

export const projects: Project[] = [
  {
    id: '1',
    code: '10020',
    name: 'Olofström',
    activities: [
      { id: '1-1', name: 'Konstruktion', status: 'Slutförd', department: 'Konstruktion', responsible: 'BH' },
      { id: '1-2', name: 'Beredning', status: 'Slutförd', department: 'Beredning', responsible: 'RP' },
      { id: '1-3', name: 'Säkerställ mattläggning', status: 'Slutförd', department: 'Projektledare', responsible: 'SK', startDate: '2025-11-24', endDate: '2025-11-24', days: 1 },
      { id: '1-4', name: 'Säkerställ frontpaneler', status: 'Slutförd', department: 'Projektledare', responsible: 'SK', startDate: '2025-11-24', endDate: '2025-11-24', days: 1 },
      { id: '1-5', name: 'Säkerställ inbetalt förskott', status: 'Slutförd', department: 'Projektledare', responsible: 'SK', startDate: '2025-12-18', endDate: '2025-12-18', days: 1 },
      { id: '1-6', name: 'Tillverkning', status: 'Pågår', department: 'Produktion', responsible: 'MS', startDate: '2025-11-24', endDate: '2026-01-30', days: 48, hasWarning: true },
      { id: '1-7', name: 'Boka hotell', status: 'Slutförd', department: 'Projektledare', responsible: 'SK', startDate: '2026-01-14', endDate: '2026-01-14', days: 1 },
      { id: '1-8', name: 'Underlag till montörer', status: 'Slutförd', department: 'Konstruktion', responsible: 'BH', startDate: '2026-01-26', endDate: '2026-01-26', days: 1 },
      { id: '1-9', name: 'Säkerställ korrekt lev.tid monitor', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK', startDate: '2026-02-02', endDate: '2026-02-02', days: 1 },
      { id: '1-10', name: 'Transport 1', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK', startDate: '2026-02-02', endDate: '2026-02-02', days: 1 },
      { id: '1-11', name: 'Montage', status: 'Ej påbörjad', department: 'Montageledare', responsible: 'AJ', startDate: '2026-02-02', endDate: '2026-02-13', days: 10 },
      { id: '1-12', name: 'Transport 2', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK', startDate: '2026-02-09', endDate: '2026-02-09', days: 1 },
      { id: '1-13', name: 'Förbesiktning', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK', startDate: '2026-02-12', endDate: '2026-02-12', days: 1 },
      { id: '1-14', name: 'Rapportera utleverans', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK', startDate: '2026-02-13', endDate: '2026-02-13', days: 1 },
      { id: '1-15', name: 'Inventering', status: 'Ej påbörjad', department: 'Montageledare', responsible: 'AJ', startDate: '2026-02-16', endDate: '2026-02-16', days: 1 },
      { id: '1-16', name: 'Besiktning', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK', startDate: '2026-03-02', endDate: '2026-03-02', days: 1 },
    ]
  },
  {
    id: '2',
    code: '10021',
    name: 'Älmhult Community',
    activities: [
      { id: '2-1', name: 'Förstudie', status: 'Slutförd', department: 'Projektledare', responsible: 'SK' },
      { id: '2-2', name: 'Konstruktion', status: 'Pågår', department: 'Konstruktion', responsible: 'BH' },
      { id: '2-3', name: 'Inköp', status: 'Ej påbörjad', department: 'Inköp', responsible: 'AM' },
    ]
  },
  {
    id: '3',
    code: '10023',
    name: 'Eriklundsskolan',
    activities: [
      { id: '3-1', name: 'Planering', status: 'Slutförd', department: 'Projektledare', responsible: 'SK' },
      { id: '3-2', name: 'Konstruktion', status: 'Pågår', department: 'Konstruktion', responsible: 'BH' },
      { id: '3-3', name: 'Beredning', status: 'Ej påbörjad', department: 'Beredning', responsible: 'RP' },
    ]
  },
  {
    id: '4',
    code: '10024',
    name: 'Örebro',
    activities: [
      { id: '4-1', name: 'Konstruktion', status: 'Slutförd', department: 'Konstruktion', responsible: 'BH' },
      { id: '4-2', name: 'Produktion', status: 'Slutförd', department: 'Produktion', responsible: 'MS' },
      { id: '4-3', name: 'Montage', status: 'Slutförd', department: 'Montageledare', responsible: 'AJ' },
    ]
  },
  {
    id: '5',
    code: '10029',
    name: 'Gunnestorpsskolan',
    activities: [
      { id: '5-1', name: 'Konstruktion', status: 'Slutförd', department: 'Konstruktion', responsible: 'BH', startDate: '2025-12-15', endDate: '2025-12-17', days: 3 },
      { id: '5-2', name: 'Beredning', status: 'Slutförd', department: 'Beredning', responsible: 'RP', startDate: '2025-12-17', endDate: '2025-12-19', days: 3 },
      { id: '5-3', name: 'Registrera tillverkningsorder', status: 'Slutförd', department: 'Projektledare', responsible: 'SK', startDate: '2025-12-19', endDate: '2025-12-19', days: 1 },
      { id: '5-4', name: 'Tillverkning', status: 'Ej påbörjad', department: 'Produktion', responsible: 'MS', startDate: '2026-02-03', endDate: '2026-04-16', days: 53 },
      { id: '5-5', name: 'Säkerställ korrekt lev.tid monitor', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '5-6', name: 'Boka montörer', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '5-7', name: 'Boka hotell', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '5-8', name: 'Boka transport', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '5-9', name: 'Montage', status: 'Ej påbörjad', department: 'Montageledare', responsible: 'AJ' },
      { id: '5-10', name: 'Rapportera utleverans', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '5-11', name: 'Inventering', status: 'Ej påbörjad', department: 'Montageledare', responsible: 'AJ' },
    ]
  },
  {
    id: '6',
    code: '10034',
    name: 'Båstad',
    activities: [
      { id: '6-1', name: 'Offert', status: 'Pågår', department: 'Sälj', responsible: 'JL' },
      { id: '6-2', name: 'Konstruktion', status: 'Ej påbörjad', department: 'Konstruktion', responsible: 'BH' },
    ]
  },
  {
    id: '7',
    code: '10035',
    name: 'Sittbänk simhall',
    activities: [
      { id: '7-1', name: 'Konstruktion', status: 'Slutförd', department: 'Konstruktion', responsible: 'BH', startDate: '2025-12-10', endDate: '2025-12-10', days: 1 },
      { id: '7-2', name: 'Inköp', status: 'Pågår', department: 'Inköp', responsible: 'AM', startDate: '2025-12-10', endDate: '2026-01-29', days: 35 },
      { id: '7-3', name: 'Leverans', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK', startDate: '2026-02-02', endDate: '2026-02-02', days: 1 },
    ]
  },
  {
    id: '8',
    code: '10036',
    name: 'Tingsryd Arena',
    activities: [
      { id: '8-1', name: 'Konstruktion', status: 'Pågår', department: 'Konstruktion', responsible: 'BH' },
      { id: '8-2', name: 'Inköp stolar', status: 'Ej påbörjad', department: 'Inköp', responsible: 'AM' },
      { id: '8-3', name: 'Räcken', status: 'Ej påbörjad', department: 'Produktion', responsible: 'MS' },
    ]
  },
  {
    id: '9',
    code: '10037',
    name: 'Ulvsunda',
    activities: [
      { id: '9-1', name: 'Offert', status: 'Pågår', department: 'Sälj', responsible: 'JL' },
      { id: '9-2', name: 'Konstruktion', status: 'Ej påbörjad', department: 'Konstruktion', responsible: 'BH' },
    ]
  },
  {
    id: '10',
    code: '10038',
    name: 'Ombyggnad Avicii',
    activities: [
      { id: '10-1', name: 'Konstruktion', status: 'Pågår', department: 'Konstruktion', responsible: 'BH', endDate: '2026-01-20' },
      { id: '10-2', name: 'Registrera tillverkningsorder', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '10-3', name: 'Tillverkning', status: 'Ej påbörjad', department: 'Produktion', responsible: 'MS' },
      { id: '10-4', name: 'Boka montörer', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '10-5', name: 'Underlag till montörer', status: 'Ej påbörjad', department: 'Konstruktion', responsible: 'BH' },
      { id: '10-6', name: 'Säkerställ korrekt lev.tid monitor', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '10-7', name: 'Boka hotell', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '10-8', name: 'Boka transport', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '10-9', name: 'Montage 1', status: 'Ej påbörjad', department: 'Montageledare', responsible: 'AJ', startDate: '2026-03-30', endDate: '2026-04-02', days: 4 },
      { id: '10-10', name: 'Montage 2', status: 'Ej påbörjad', department: 'Montageledare', responsible: 'AJ', startDate: '2026-04-07', endDate: '2026-04-10', days: 4 },
      { id: '10-11', name: 'Rapportera utleverans', status: 'Ej påbörjad', department: 'Projektledare', responsible: 'SK' },
      { id: '10-12', name: 'Inventering', status: 'Ej påbörjad', department: 'Montageledare', responsible: 'AJ' },
    ]
  },
  {
    id: '11',
    code: '10039',
    name: 'Novo Nordisk',
    activities: [
      { id: '11-1', name: 'Förstudie', status: 'Pågår', department: 'Sälj', responsible: 'JL' },
      { id: '11-2', name: 'Offert', status: 'Ej påbörjad', department: 'Sälj', responsible: 'JL' },
    ]
  },
];

export const salesForecast: SalesForecast[] = [
  { project: 'Erikslundskolan Borås', product: 'Kalle', months: { Jan: 0.40 } },
  { project: 'Olofström', product: 'Teleskopläktare', months: { Feb: 2.20 } },
  { project: 'Spyken - Input', product: 'Teleskopläktare', months: { Apr: 0.40 } },
  { project: 'Gunnestorpsskolan', product: 'Kalle', months: { Mar: 0.54 }, notes: 'Leverans April /SK' },
  { project: 'Scenesalg', product: 'Teleskopläktare+Kalle', months: { Mar: 1.00, Jun: 1.00, Sep: 1.00, Dec: 0.00 } },
  { project: 'Bröndby dam', product: 'Abacus/plast stol', months: { Jun: 1.00 } },
  { project: 'Båstad - Tennis stadium', product: 'Abacus/plast stol', months: { May: 6.85 } },
  { project: 'Björkhaga', product: 'Stadium Comfort', months: { May: 0.64 } },
  { project: 'Hillängen', product: 'Stadium Comfort', months: { May: 0.66 } },
  { project: 'Kristianstad Arena', product: 'Stadium Comfort', months: { May: 3.80 } },
  { project: 'Kristianstad Arena', product: 'Montage fasta stolar', months: { Jun: 0.70 } },
  { project: 'Ikea', product: 'Kalle', months: { Jun: 0.43 } },
  { project: 'NA Bygg', product: 'Teleskopläktare', months: { Jun: 1.90 }, notes: 'Leverans Sep /SK' },
  { project: 'Färjestad', product: 'Stadium Comfort', months: { Jun: 1.10 } },
  { project: 'Tingsryd (stolar)', product: 'Stadium Comfort', months: { Jun: 3.95 } },
  { project: 'Tingsryd (räcken)', product: 'Egen tillverkning/inköp', months: { Jun: 2.00 } },
  { project: 'Ulfsunda', product: 'Teleskopläktare', months: { Jul: 5.00 } },
  { project: 'Katrineholm', product: 'Kalle', months: { Aug: 3.20 } },
  { project: 'Berga', product: 'Kalle', months: { Aug: 1.20 } },
  { project: 'Brännkyrkehallen', product: 'Stadium Comfort', months: { Oct: 0.90 } },
  { project: 'Blackbox Östersund', product: 'Teleskopläktare', months: { Oct: 0.92 } },
  { project: 'Köttinspektionen', product: 'Teleskopläktare', months: { Nov: 0.65 } },
  { project: 'Sätra ishall, SSEA', product: 'Stadium Comfort', months: { Nov: 2.40 } },
  { project: 'Kulturståket Karlskrona', product: 'Teleskopläktare', months: { Nov: 0.50 } },
  { project: 'Lomma', product: 'Kalle', months: { Dec: 1.00 } },
  { project: 'Visby Roma', product: 'Stadium Comfort', months: { Dec: 2.70 } },
  { project: 'Nya Huddingehallen', product: 'Teleskopläktare', months: { Dec: 3.70 } },
];

export const monthlyTotals = {
  Jan: 0.4,
  Feb: 2.2,
  Mar: 2.5,
  Apr: 2.4,
  May: 14.0,
  Jun: 13.1,
  Jul: 5.0,
  Aug: 6.4,
  Sep: 2.0,
  Oct: 3.8,
  Nov: 4.6,
  Dec: 8.4,
};

export const yearTotal = 64.7;

export const departments: Department[] = ['Sälj', 'Projektledare', 'Konstruktion', 'Beredning', 'Inköp', 'Produktion', 'Montageledare'];
export const statuses: Status[] = ['Ej påbörjad', 'Pågår', 'Slutförd', 'Försenad'];
