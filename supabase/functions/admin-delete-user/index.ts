/**
 * Edge Function: admin-delete-user
 *
 * Security guarantees:
 * - Requires a valid JWT
 * - Confirms the caller has role = 'admin' server-side
 * - Uses service_role key to delete from auth.users (not possible from client)
 * - Prevents admins from deleting themselves
 * - Prevents deletion of other admins
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // 2. Confirm caller is admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return errJson('Forbidden: Admin access required', 403);
    }

    // 3. Parse target user ID
    const { userId } = await req.json();
    if (!userId) return errJson('Missing userId', 400);

    // 4. Prevent self-deletion
    if (userId === caller.id) {
      return errJson('Cannot delete your own account', 422);
    }

    // 5. Prevent deletion of other admins
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (targetProfile?.role === 'admin') {
      return errJson('Cannot delete another admin account', 422);
    }

    // 6. Hard-delete from auth.users (cascades to profiles via FK)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return errJson('Failed to delete user: ' + deleteError.message, 500);
    }

    // 7. Log the action
    await supabase.from('activity_logs').insert({
      admin_id: caller.id,
      action: 'DELETED_USER',
      details: { deleted_user_id: userId, email: targetProfile?.email },
    });

    return okJson({ success: true, deleted: userId });
  } catch (err) {
    if (err instanceof Response) return err;
    return errJson('Internal server error', 500);
  }
});
