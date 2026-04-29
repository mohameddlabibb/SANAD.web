import { supabase } from '../lib/supabaseClient.js';

/**
 * @param {{ bookingId: string, userId: string, workerId: string, rating: number, comment?: string, ratingType: 'user_to_worker' | 'worker_to_user' }} params
 */
export async function submitFeedback({ bookingId, userId, workerId, rating, comment, ratingType }) {
  const { error: insertError } = await supabase
    .from('feedback')
    .insert({
      booking_id: bookingId,
      user_id: userId,
      worker_id: workerId,
      rating,
      comment: comment || null,
      rating_type: ratingType,
    });

  if (insertError) throw insertError;

  // Recalculate and update worker's average rating (only user_to_worker ratings count)
  if (ratingType === 'user_to_worker') {
    const { data: rows, error: avgError } = await supabase
      .from('feedback')
      .select('rating')
      .eq('worker_id', workerId)
      .eq('rating_type', 'user_to_worker');

    if (avgError) throw avgError;

    const avg = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;

    const { error: updateError } = await supabase
      .from('workers')
      .update({
        average_rating: Math.round(avg * 10) / 10,
        total_reviews: rows.length,
      })
      .eq('id', workerId);

    if (updateError) throw updateError;
  }
}

/**
 * @param {string} bookingId
 * @param {'user_to_worker' | 'worker_to_user'} ratingType
 * @returns {Promise<{ rating: number, comment: string | null, created_at: string, rating_type: string } | null>}
 */
export async function getFeedbackByBookingId(bookingId, ratingType) {
  const { data, error } = await supabase
    .from('feedback')
    .select('rating, comment, created_at, rating_type')
    .eq('booking_id', bookingId)
    .eq('rating_type', ratingType)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * @param {string} workerId
 * @returns {Promise<Array<{ rating: number, comment: string | null, created_at: string, profiles: { full_name: string } }>>}
 */
export async function getWorkerFeedback(workerId) {
  const { data, error } = await supabase
    .from('feedback')
    .select('rating, comment, created_at, profiles(full_name)')
    .eq('worker_id', workerId)
    .eq('rating_type', 'user_to_worker')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
