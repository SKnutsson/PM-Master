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
  overview_x: number;
  overview_y: number;
  color: string;
  order_index: number;
}

export type ObjectKind = 'station' | 'machine' | 'storage' | 'group';

export interface ObjectData {
  capacity?: number;      // st/tim
  cycle_time?: number;    // sekunder
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

export const OBJECT_PRESETS: {
  type: ObjectKind;
  label: string;
  icon: string;
  color: string;
}[] = [
  { type: 'station', label: 'Station', icon: 'wrench', color: '#1C7F72' },
  { type: 'machine', label: 'Maskin', icon: 'cog', color: '#18323A' },
  { type: 'storage', label: 'Lager', icon: 'package', color: '#92AE9D' },
  { type: 'group', label: 'Avdelning', icon: 'layers', color: '#5C7A6B' },
];
