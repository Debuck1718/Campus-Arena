import { supabase } from '../supabaseClient';

/**
 * Admin status is owned by the `admin_roles` table (see migration 0020).
 * `profiles.role` is a derived mirror kept in sync by the
 * `sync_profile_role_trg` trigger; we read the mirror for speed, but the
 * database — not this column — is the source of truth. Every privileged
 * server operation re-checks via `public.is_admin()`, so a stale mirror can
 * only mislead the UI, never grant access.
 *
 * History: before migration 0019, `profiles.role` was client-writable and
 * this read was effectively a full admin takeover. 0019 locked the column;
 * 0020 unified the two systems so the UI and the policies cannot disagree.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) return false;

  // Moderator is a lower-tier admin and gets panel access; policies decide
  // what each tier can actually do.
  return profile.role === 'admin' || profile.role === 'moderator';
}

/**
 * Grants or revokes an admin/moderator role via the `set_admin_role` RPC.
 * The client cannot write `profiles.role` directly: migration 0019 restricts
 * that column to admins, and migration 0020 moved the write path into a
 * `security definer` function that enforces admin status server-side.
 */
export async function makeAdmin(
  profileId: string,
  role: 'admin' | 'moderator' | 'player' = 'admin'
) {
  const { error } = await supabase.rpc('set_admin_role', {
    p_profile_id: profileId,
    p_role: role,
  });

  if (error) throw error;
  return true;
}
