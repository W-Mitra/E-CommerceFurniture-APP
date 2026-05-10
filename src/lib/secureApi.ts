/**
 * secureApi.ts
 *
 * A typed client for calling Supabase Edge Functions.
 * All requests are authenticated with the caller's live JWT, ensuring
 * the server can verify identity and role without trusting the client.
 */
import { supabase } from './supabase';

const FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

/**
 * Internal helper — attaches the current session's JWT as a Bearer token.
 * Returns null if the user is not logged in.
 */
async function callFunction<T = any>(
  name: string,
  body: object,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { data: null, error: 'Not authenticated' };

    const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Live JWT — the Edge Function verifies this server-side
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify(body),
    });

    const json = await response.json();

    if (!response.ok) {
      return { data: null, error: json.error ?? `HTTP ${response.status}` };
    }

    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err.message ?? 'Network error' };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
  items: Array<{ id: string; quantity: number }>;
  shipping_address: string;
  buyer_name: string;
  buyer_phone: string;
}

export interface PlaceOrderResult {
  success: boolean;
  order: { id: string; total_amount: number; status: string };
}

/**
 * Place an order via the secure Edge Function.
 * Product prices are verified and totals calculated server-side —
 * the client cannot manipulate prices.
 */
export async function placeOrderSecure(payload: PlaceOrderPayload) {
  return callFunction<PlaceOrderResult>('place-order', payload);
}

/**
 * Write an admin activity log entry via the secure Edge Function.
 * The server confirms the caller is an admin before accepting the write.
 */
export async function logAdminActivity(action: string, details: string | object) {
  return callFunction('admin-log', { action, details });
}

/**
 * Delete a user account via the secure Edge Function.
 * Only callable by admins. Uses the service_role key server-side to
 * hard-delete from auth.users — not possible from the client SDK.
 */
export async function deleteUserSecure(userId: string) {
  return callFunction('admin-delete-user', { userId });
}
