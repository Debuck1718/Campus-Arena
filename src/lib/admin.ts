import { supabase } from '../supabaseClient';

/**
 * Updates a user's role in the profiles table.
 * Used to promote players to Admin or Moderator.
 */
export async function makeAdmin(profileId: string, role: 'admin' | 'moderator' | 'user' = 'admin') {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId);

  if (error) throw error;
  return true;
}

/**
 * Checks if the current authenticated user has administrative privileges.
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

  // Returns true if role is exactly 'admin'
  return profile.role === 'admin';
}
