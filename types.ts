export enum ReservationStatus {
  AGUARDANDO = 'aguardando retirada',
  EM_USO = 'locação em uso',
  CANCELADA = 'reserva cancelada',
  CONCLUIDO = 'locação concluída',
  PERDIDA = 'reserva perdida'
}

export type VehicleChecklist = Record<string, {
  hasIssue: boolean;
  observation: string;
}>;

export interface InsuranceItem {
  name: string;
  value: number;
  selected: boolean;
}

export interface ProgressiveDiscount {
  day: number;
  discount_percent: number;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  cnh_number: string;
  cnh_category: string;
  cnh_expiration: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  status: 'Ativo' | 'Inativo' | 'Pendente' | 'Inadimplente';
  vip: boolean;
  score: number;
  last_rental_date?: string;
  created_at?: string;
  cnh_url?: string;
  address_proof_url?: string;
  selfie_url?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  km: number;
  status: 'Disponível' | 'Alugado' | 'Reservado' | 'Em manutenção' | 'Desativado';
  color: string;
  passengers: number;
  doors: number;
  transmission: 'Manual' | 'Automático';
  renavan: string;
  chassis: string;
  default_security_deposit: number;
  default_insurance_value: number;
  daily_rate?: number;
  image_url?: string;
}

export interface Reservation {
  id: string;
  client_id: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  status: ReservationStatus;
  created_at?: string;
  daily_rate: number;
  days: number;
  total_value: number;
  security_deposit: number;
  insurance_value: number;
  insurance_details?: InsuranceItem[];
  additional_services: string;
  observations?: string;
  pickup_photos?: string[];
  actual_pickup_date?: string;
  pickup_checklist?: VehicleChecklist;
  return_photos?: string[];
  actual_return_date?: string;
  return_checklist?: VehicleChecklist;
  origin?: 'painel' | 'site';
  shipping_value?: number;
  shipping_status?: 'definido' | 'a_combinar';
  // UI Helper fields (not in DB)
  clientName?: string;
  clientCep?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  dateStr?: string;
}

export interface ShippingRate {
  id: string;
  region_name: string;
  cep_start: string | null;
  cep_end: string | null;
  neighborhood: string | null;
  price: number;
  created_at?: string;
}

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  full_name?: string;
  avatar_url?: string;
  signature_url?: string;
}

export interface APIKey {
  id: string;
  key_value: string;
  client_name: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export type View = 'LOGIN' | 'DASHBOARD' | 'CLIENTS' | 'VEHICLES' | 'RESERVATIONS' | 'SETTINGS' | 'USERS' | 'DISCOUNTS' | 'INTEGRATIONS' | 'SIGNATURE' | 'SHIPPING_RATES';