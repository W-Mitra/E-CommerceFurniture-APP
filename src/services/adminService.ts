import { supabase } from '../lib/supabase';
import { logAdminActivity } from '../lib/secureApi';

export const adminService = {
  /**
   * Log an administrative action.
   * Routes through the secure Edge Function (admin-log) which verifies
   * the caller's admin role server-side before accepting the write.
   * Falls back to a direct insert if the Edge Function is unreachable.
   *
   * Supported actions: ADDED_ITEM, EDITED_ITEM, DELETED_ITEM,
   *                    HID_ITEM, SHOWED_ITEM, ADMIN_ACCESS
   */
  async logActivity(adminId: string, action: string, details: string | object) {
    try {
      // Primary: secure Edge Function path (server verifies admin role)
      const { error } = await logAdminActivity(action, details);
      if (!error) return;

      // Fallback: direct insert (still protected by RLS, but no server-side role check)
      console.warn('[AdminService] Edge Function failed, using direct insert fallback:', error);
      const detailsPayload: object =
        typeof details === 'string' ? { message: details } : details;

      const { error: dbError } = await supabase
        .from('activity_logs')
        .insert({ admin_id: adminId, action, details: detailsPayload });

      if (dbError) console.error('[AdminService] Fallback insert failed:', dbError.message);
    } catch (err) {
      console.error('[AdminService] Unexpected error:', err);
    }
  },
};
