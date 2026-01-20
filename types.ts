

export interface Cidade {
  id: string;
  nome: string;
  created_at?: string;
}

export interface Cargo {
  id: string;
  nome: string;
  created_at?: string;
}

export type CargoType = string; // Mantendo para compatibilidade temporária


export interface Curriculo {
  id: string;
  nome: string;
  cidade: string;
  cargo_desejado: string;
  descricao: string;
  arquivo_url: string; // Link de fallback ou Supabase
  arquivo_drive_id?: string;
  arquivo_drive_url?: string;
  storage_tipo: 'supabase' | 'drive';
  data_upload: string;
  created_at: string;
}

export interface ConfigItem {
  id: string;
  nome: string;
  created_at: string;
}

export interface KPIStats {
  total: number;
  porCidade: Record<string, number>;
  porCargo: Record<string, number>;
  porDia: Record<string, number>;
  storageStats: {
    drive: number;
    supabase: number;
  }
}

export interface AccessLog {
  id: string;
  user_id: string;
  user_email: string;
  resource_id?: string;
  action: string;
  details?: any;
  timestamp: string;
}

export interface Loja {
  id: string;
  nome: string;
  cidade_id?: string;
  created_at?: string;
}

export type Role = 'admin' | 'recruiter';

export interface UserRole {
  id: string;
  user_id: string;
  email: string;
  role: Role;
  created_by?: string;
  created_at: string;
  is_active: boolean;
}

export interface UserCity {
  id: string;
  user_id: string;
  cidade_nome: string;
  created_at: string;
}

export interface UserWithAccess extends UserRole {
  cities: string[];
  lojas: string[];
}
