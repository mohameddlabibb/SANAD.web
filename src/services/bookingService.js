import { supabase } from '../lib/supabaseClient.js';

const BOOKINGS_TABLE = 'bookings';

/**
 * @param {NewBookingPayload} data
 * @returns {Promise<Booking>}
 */
export async function createBooking(data) {
  const { data: created, error } = await supabase
    .from(BOOKINGS_TABLE)
    .insert(data)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return /** @type {Booking} */ (created);
}

/**
 * @param {string} userId
 * @returns {Promise<Booking[]>}
 */
export async function getUserBookings(userId) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return /** @type {Booking[]} */ (data);
}

/**
 * @param {string} bookingId
 * @returns {Promise<Booking>}
 */
export async function getBookingById(bookingId) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error) {
    throw error;
  }

  return /** @type {Booking} */ (data);
}

/**
 * @param {string} bookingId
 * @param {string} status
 * @returns {Promise<Booking>}
 */
export async function updateBookingStatus(bookingId, status) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return /** @type {Booking} */ (data);
}

/**
 * @param {string} bookingId
 * @param {string} newDate - YYYY-MM-DD
 * @param {string} newStartTime - HH:mm:ss
 * @returns {Promise<Booking>}
 */
export async function rescheduleBooking(bookingId, newDate, newStartTime) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .update({ booking_date: newDate, start_time: newStartTime })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;

  return /** @type {Booking} */ (data);
}

/**
 * @param {string} workerId
 * @returns {Promise<Booking[]>}
 */
export async function getWorkerBookings(workerId) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select('*, profiles!bookings_user_id_fkey(full_name, phone_number)')
    .eq('worker_id', workerId)
    .order('booking_date', { ascending: false });

  if (error) {
    throw error;
  }

  return /** @type {any[]} */ (data);
}

// Statuses that mean a deposit has already been submitted (paid or pending approval)
const DEPOSIT_ACTIVE_STATUSES = ['deposit_pending', 'deposit_paid', 'ongoing', 'completed', 'balance_pending'];

/**
 * Cancels a booking and, if a deposit was already paid/pending, flags it for refund.
 * @param {string} bookingId
 * @param {{ userId?: string, notifyRefund?: boolean }} [opts]
 * @returns {Promise<Booking>}
 */
export async function cancelBooking(bookingId, { userId, notifyRefund = true } = {}) {
  // Read current status so we know whether to flag a deposit refund
  const { data: current, error: fetchError } = await supabase
    .from(BOOKINGS_TABLE)
    .select('status, user_id')
    .eq('id', bookingId)
    .single();

  if (fetchError) throw fetchError;

  const needsRefund = DEPOSIT_ACTIVE_STATUSES.includes(current?.status ?? '');
  const updates = {
    status: 'cancelled',
    ...(needsRefund ? { deposit_refund_status: 'pending' } : {}),
  };

  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;

  // Reverse any points awarded for this booking
  const recipientUserId = userId ?? current?.user_id;
  if (recipientUserId) {
    const { deductPointsForBooking } = await import('./pointsService');
    await deductPointsForBooking(bookingId, recipientUserId).catch(() => {});
  }

  if (needsRefund && notifyRefund) {
    const recipientId = userId ?? current?.user_id;
    if (recipientId) {
      const { createNotification } = await import('./notificationService.js');
      await createNotification({
        receiver_id: recipientId,
        title: 'Deposit Refund',
        message: 'Your booking was cancelled. Your 20% deposit will be refunded shortly.',
        booking_id: bookingId,
      }).catch(() => {});
    }
  }

  return /** @type {Booking} */ (data);
}

