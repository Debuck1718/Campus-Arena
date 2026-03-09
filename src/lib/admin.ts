import { supabase } from '../supabaseClient';

// Call this function with a user id to make them an admin
export async function makeAdmin(profileId: string, role: 'admin' | 'moderator' = 'admin') {
  const { error } = await supabase.from('admin_roles').insert({ profile_id: profileId, role });
  if (error) throw error;
  return true;
}

// Check if the current user is admin
export async function isCurrentUserAdmin() {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin', { p: user.id });
  if (error) throw error;
  return !!data;
}
