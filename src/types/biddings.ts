// src/types/biddings.ts

export type BiddingRequestStatus = 'open' | 'accepted' | 'cancelled';
export type BidStatus = 'pending' | 'accepted' | 'rejected';

export interface BiddingRequest {
  id: string;
  user_id: string;
  service_type: string;
  title: string;
  description: string;
  booking_date: string;       // YYYY-MM-DD
  start_time: string;         // HH:mm:ss
  duration_hours: number;
  address: string;
  status: BiddingRequestStatus;
  created_at: string;
}

export interface Bid {
  id: string;
  request_id: string;
  worker_id: string;
  proposed_price: number;
  message: string | null;
  status: BidStatus;
  created_at: string;
}

export interface BidWithWorker extends Bid {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  worker_rating: number | null;
}

export interface BiddingRequestWithBids extends BiddingRequest {
  bids: BidWithWorker[];
}

export interface BiddingRequestWithCount extends BiddingRequest {
  bid_count: number;
}

export interface NewBiddingRequestPayload {
  user_id: string;
  service_type: string;
  title: string;
  description: string;
  booking_date: string;
  start_time: string;
  duration_hours: number;
  address: string;
}

export interface NewBidPayload {
  request_id: string;
  worker_id: string;
  proposed_price: number;
  message?: string | null;
}
