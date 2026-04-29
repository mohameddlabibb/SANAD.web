export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'confirmed'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'payment_pending';

export interface ChefBookingDetails {
  meals_count: number;
  prep_for_week: boolean;
  ingredients_available: 'available' | 'missing' | 'partial';
  missing_ingredients?: string;
  meal_types: string[];
}

export interface MaidBookingDetails {
  rooms_count: number;
  cleaning_type: 'regular' | 'deep' | 'move_in_out';
  laundry_included: boolean;
}

export interface CaregiverBookingDetails {
  with_overnight: boolean;
  overnight_nights?: number;
}

export type BookingExtraDetails =
  | ChefBookingDetails
  | MaidBookingDetails
  | CaregiverBookingDetails;

export interface Booking {
  id: string;
  user_id: string | null;
  worker_id: string | null;
  booking_date: string; // ISO date (YYYY-MM-DD)
  start_time: string; // time (HH:mm:ss)
  duration_hours: number;
  total_price: number;
  status: BookingStatus | null;
  notes: string | null;
  created_at: string | null;
  booking_type: 'hour' | 'package' | 'emergency' | 'day' | null;
  duration_value: number | null;
  address: string | null;
  management_fee: number | null;
  emergency_fee: number | null;
  selected_months: string | null;
  booking_extra_details: BookingExtraDetails | null;
}

export interface BookingWithWorker extends Booking {
  workers: { service_type: string } | null;
}

export interface NewBookingPayload {
  user_id: string;
  worker_id: string;
  booking_date: string;
  start_time: string;
  total_price: number;
  booking_type: 'hour' | 'package' | 'emergency' | 'day';
  status?: BookingStatus;
  duration_hours?: number | null;
  duration_value?: number | null;
  notes?: string | null;
  address?: string | null;
  management_fee?: number;
  emergency_fee?: number;
  selected_months?: string | null;
  booking_extra_details?: BookingExtraDetails | null;
}
