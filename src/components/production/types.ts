export interface ProductionProject {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionFactory {
  id: string;
  project_id: string;
  name: string;
  blueprint_url: string | null;
  blueprint_width: number | null;
  blueprint_height: number | null;
  blueprint_scale: number;
  // canvas-space blueprint transform (v2)
  blueprint_x: number;
  blueprint_y: number;
  blueprint_opacity: number;
  blueprint_locked: boolean;
  overview_x: number;
  overview_y: number;
  color: string;
  order_index: number;
}

export type ObjectKind =
  | 'production_group'
  // legacy — still stored, rendered as production groups
  | 'station' | 'machine' | 'storage' | 'group';

export type GroupShape = 'rect' | 'rounded' | 'circle' | 'pill';

export const GROUP_TYPES = [
  { value: 'welding', label: 'Svets' },
  { value: 'assembly', label: 'Montering' },
  { value: 'machining', label: 'Bearbetning' },
  { value: 'storage', label: 'Lager' },
  { value: 'quality', label: 'Kvalitetskontroll' },
  { value: 'inbound', label: 'Inleverans' },
  { value: 'outbound', label: 'Utleverans' },
  { value: 'packing', label: 'Packning' },
  { value: 'other', label: 'Övrigt' },
] as const;

export interface ObjectData {
  group_type?: string;     // welding/assembly/…
  capacity?: number;       // st/h
  cycle_time?: number;     // sekunder
  staffing?: number;
  status?: 'ok' | 'warning' | 'bottleneck';
  note?: string;
}

export interface ProductionObject {
  id: string;
  factory_id: string;
  type: ObjectKind;
  name: string;
  category: string | null;
  icon: string | null;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  shape: GroupShape;
  border_color: string | null;
  border_width: number;
  data: ObjectData;
}

export interface ProductionFlow {
  id: string;
  project_id: string;
  source_object_id: string | null;
  target_object_id: string | null;
  source_factory_id: string | null;
  target_factory_id: string | null;
  label: string | null;
  flow_type: 'material' | 'transport' | 'info';
  volume: number | null;
  frequency: string | null;
  lead_time: number | null;
  batch_size: number | null;
  color: string;
  routing: 'smoothstep' | 'step' | 'bezier';
  data: Record<string, any>;
}

export interface ProductionComment {
  id: string;
  project_id: string;
  factory_id: string | null;
  x: number;
  y: number;
  text: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
}

export const FLOW_COLORS = {
  material: '#1E4C7A',
  transport: '#F59E0B',
  info: '#8B5CF6',
} as const;
