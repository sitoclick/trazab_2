export interface User {
  name: string;
  role: string;
}

export type SyncStatus = 'idle' | 'running' | 'success' | 'error';

export interface LogEntry {
  timestamp: string;
  document: string;
  action: string;
  details: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type SystemStatus = 'operational' | 'degraded' | 'down';

export interface ProductionRow {
  FechaRegistro: string;
  Tipo: string;
  Codigo: string;
  Descripcion: string;
  Partida: string;
  Serie: string;
  Unidades: number;
  Peso: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  data?: any[];
  timestamp: Date;
}

export interface MiraviaOrder {
  order_id: string;
  status: string;
  created_at: string;
  items: MiraviaOrderItem[];
}

export interface MiraviaOrderItem {
  order_item_id: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface SqlAgent {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  fechaAlta: string;
}

export interface CommissionRule {
  id: string;
  agentId: string;
  agentName: string;
  clientId?: string;
  clientName?: string;
  category?: string[];
  formats?: string[];
  rate: number;
  description?: string;
  startDate?: string;
  endDate?: string;
}
