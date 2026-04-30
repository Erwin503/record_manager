export type UserRole = "super_admin" | "business_admin" | "employee" | "client";

export interface User {
  id?: number;
  name?: string;
  email: string;
  password_hash: string;
  phone?: string;
  role: UserRole;
}

export interface Business {
  id?: number;
  owner_id: number;
  name: string;
  description?: string;
  business_type:
    | "tire_service"
    | "beauty_salon"
    | "barbershop"
    | "spa"
    | "repair_service"
    | "other";
  phone?: string;
  email?: string;
  website?: string;
  status: "active" | "inactive" | "suspended";
}

export interface Branch {
  id?: number;
  business_id: number;
  name: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  timezone: string;
  is_main: boolean;
}

export interface ServiceCategory {
  id?: number;
  business_id: number;
  name: string;
  description?: string;
}

export interface Service {
  id?: number;
  business_id: number;
  category_id?: number | null;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface ServiceVariant {
  id?: number;
  service_id: number;
  name: string;
  duration_minutes: number;
  price: number;
  currency: string;
  is_active: boolean;
}

export interface EmployeeProfile {
  id?: number;
  user_id: number;
  business_id: number;
  branch_id?: number | null;
  position?: string;
  bio?: string;
  photo_url?: string;
  is_active: boolean;
}

export interface EmployeeServiceVariant {
  id?: number;
  employee_id: number;
  service_variant_id: number;
}

export interface ScheduleSlot {
  id?: number;
  employee_id: number;
  branch_id?: number | null;
  starts_at: Date | string;
  ends_at: Date | string;
  status: "available" | "blocked";
  source: "manual" | "generated";
}

export interface Appointment {
  id?: number;
  business_id: number;
  branch_id?: number | null;
  service_id: number;
  service_variant_id: number;
  employee_id: number;
  client_id?: number | null;
  schedule_slot_id?: number | null;
  starts_at: Date | string;
  ends_at: Date | string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "canceled" | "no_show";
  price_snapshot: number;
  duration_snapshot_minutes: number;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  comment?: string;
  cancel_reason?: string;
}
