import { supabase } from '../supabaseClient';

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, platform, avatar_url');
  if (error) throw error;
  return data;
}

export async function removeUser(userId: string) {
  // Soft delete: set a flag or actually delete
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
  return true;
}

export async function getAllMatchResults() {
  const { data, error } = await supabase.from('match_results').select('*');
  if (error) throw error;
  return data;
}

export async function removeMatchResult(resultId: string) {
  const { error } = await supabase.from('match_results').delete().eq('id', resultId);
  if (error) throw error;
  return true;
}

export async function banUser(userId: string) {
  // Add a banned flag or remove from profiles
  const { error } = await supabase.from('profiles').update({ banned: true }).eq('id', userId);
  if (error) throw error;
  return true;
}

export async function unbanUser(userId: string) {
  const { error } = await supabase.from('profiles').update({ banned: false }).eq('id', userId);
  if (error) throw error;
  return true;
}
