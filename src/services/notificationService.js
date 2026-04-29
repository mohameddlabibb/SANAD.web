import { supabase } from '../lib/supabaseClient.js';

export async function createNotification({ receiver_id, title, message, booking_id }) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      receiver_id,
      title_en: title,
      message_en: message,
      ...(booking_id ? { booking_id } : {}),
    });

  if (error) {
    throw error;
  }
}

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function markAsRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}

export async function markAllAsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
}
