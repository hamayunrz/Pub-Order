import { getSupabase } from './supabase.js';
import { SWIPE_TYPES } from './cart.js';

export async function loadMenu(signal) {
  const response = await fetch('/api/menu', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Menu is temporarily unavailable. Please try again.');
  const items = await response.json();
  if (!Array.isArray(items) || items.some((item) => !item || typeof item.id !== 'string' || !item.id ||
    typeof item.name !== 'string' || typeof item.category !== 'string' || !SWIPE_TYPES.includes(item.swipeType) ||
    typeof item.available !== 'boolean') || new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('The menu could not be loaded. Please try again.');
  }
  return items;
}

export async function reviewCart(cart, catalog) {
  const supabase = getSupabase();
  const { data, error } = supabase ? await supabase.auth.getSession() : { data: null };
  if (error || !data?.session?.access_token) return { signInRequired: true };
  const response = await fetch('/api/checkout/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({
      swipes: cart.swipes,
      items: Object.entries(cart.items).map(([id, quantity]) => ({ id, quantity,
        expectedSwipeType: cart.reviewedTypes?.[id] || catalog.find((item) => item.id === id)?.swipeType,
      })),
    }),
  });
  if (response.status === 401) return { signInRequired: true };
  if (!response.ok) throw new Error(response.status === 422 ? 'The cart is invalid. Check quantities and try again.' : 'Could not check the latest menu. Your cart is still here; please try again.');
  return response.json();
}
