/**
 * Edge Function: admin-log
 *
 * Security guarantees:
 * - Requires a valid JWT
 * - Confirms the caller has role = 'admin' in the profiles table (server-side check)
 * - Regular users cannot forge admin activity log entries
 */
/// <reference lib="deno.window" />
import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase-js';
import { corsHeaders, verifyUser, okJson, errJson } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller
    const caller = await verifyUser(req);

    // 2. Use service role to bypass RLS and verify admin role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return errJson('Forbidden: Admin access required', 403);
    }

    // 3. Parse and validate the log payload
    const { action, details } = await req.json();
    if (!action) return errJson('Missing action field', 400);

    const ALLOWED_ACTIONS = [
      'ADDED_ITEM', 'EDITED_ITEM', 'DELETED_ITEM',
      'HID_ITEM', 'SHOWED_ITEM', 'ADMIN_ACCESS',
    ];
    if (!ALLOWED_ACTIONS.includes(action)) {
      return errJson(`Unknown action: ${action}`, 400);
    }

    // 4. Write the verified log entry
    const detailsPayload: object =
      typeof details === 'string' ? { message: details } : details ?? {};

    const { error: logError } = await supabase.from('activity_logs').insert({
      admin_id: caller.id,
      action,
      details: detailsPayload,
    });

    if (logError) return errJson('Failed to write log: ' + logError.message, 500);

    return okJson({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return errJson('Internal server error', 500);
  }
});
