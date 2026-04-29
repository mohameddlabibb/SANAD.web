// src/services/biddingService.js
import { supabase } from '../lib/supabaseClient.js';

export async function createBiddingRequest(payload) {
  const { data, error } = await supabase
    .from('bidding_requests')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserBiddingRequests(userId) {
  const { data, error } = await supabase
    .from('bidding_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!data?.length) return [];

  // Attach bid count per request
  const ids = data.map((r) => r.id);
  const { data: counts } = await supabase
    .from('bids')
    .select('request_id')
    .in('request_id', ids);

  const countMap = {};
  (counts ?? []).forEach(({ request_id }) => {
    countMap[request_id] = (countMap[request_id] ?? 0) + 1;
  });

  return data.map((r) => ({ ...r, bid_count: countMap[r.id] ?? 0 }));
}

export async function getBiddingRequestById(requestId) {
  const { data: request, error } = await supabase
    .from('bidding_requests')
    .select('*, bids(*, profiles(full_name, avatar_url))')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  if (!request) return null;

  const bids = request.bids ?? [];
  if (!bids.length) return { ...request, bids: [] };

  const workerIds = bids.map((b) => b.worker_id);
  const { data: workers } = await supabase
    .from('workers')
    .select('id, rating')
    .in('id', workerIds);

  const ratingMap = {};
  (workers ?? []).forEach((w) => { ratingMap[w.id] = w.rating; });

  return {
    ...request,
    bids: bids
      .map((b) => ({ ...b, worker_rating: ratingMap[b.worker_id] ?? null }))
      .sort((a, b) => a.proposed_price - b.proposed_price),
  };
}

export async function getOpenRequestsForWorker(serviceType) {
  const { data, error } = await supabase
    .from('bidding_requests')
    .select('*')
    .eq('service_type', serviceType)
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getWorkerBidOnRequest(requestId, workerId) {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('request_id', requestId)
    .eq('worker_id', workerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createBid(payload) {
  const { data, error } = await supabase
    .from('bids')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWorkerBids(workerId) {
  const { data, error } = await supabase
    .from('bids')
    .select('*, bidding_requests(title, service_type, booking_date, status)')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Calls the accept_bid RPC — atomic: accept bid, reject others, create booking. Returns new booking id. */
export async function acceptBid(bidId, requestId) {
  const { data, error } = await supabase
    .rpc('accept_bid', { p_bid_id: bidId, p_request_id: requestId });
  if (error) throw error;
  return data; // uuid of created booking
}

export async function cancelBiddingRequest(requestId) {
  const { error: reqErr } = await supabase
    .from('bidding_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
  if (reqErr) throw reqErr;

  const { error: bidsErr } = await supabase
    .from('bids')
    .update({ status: 'rejected' })
    .eq('request_id', requestId)
    .eq('status', 'pending');
  if (bidsErr) throw bidsErr;
}
