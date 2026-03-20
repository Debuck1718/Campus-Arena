import { supabase } from '../supabaseClient';

/** * USER MANAGEMENT 
 */

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, platform, avatar_url, banned, created_at')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function banUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ banned: true })
    .eq('id', userId);
    
  if (error) throw error;
  return true;
}

export async function unbanUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ banned: false })
    .eq('id', userId);
    
  if (error) throw error;
  return true;
}

export async function removeUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
    
  if (error) throw error;
  return true;
}

/** * DISPUTE & TICKET MANAGEMENT 
 */

export async function getAllDisputes() {
  const { data, error } = await supabase
    .from('disputes')
    .select(`
      *,
      reporter:raised_by (username, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateDisputeStatus(disputeId: string, status: 'pending' | 'investigating' | 'resolved' | 'dismissed') {
  const { error } = await supabase
    .from('disputes')
    .update({ 
      status,
      updated_at: new Date().toISOString() 
    })
    .eq('id', disputeId);

  if (error) throw error;
  return true;
}

/** * MATCH RESULTS & EVIDENCE 
 */

export async function getAllMatchResults() {
  const { data, error } = await supabase
    .from('match_results')
    .select(`
      *,
      reporter:reported_by (username)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function removeMatchResult(resultId: string) {
  const { error } = await supabase
    .from('match_results')
    .delete()
    .eq('id', resultId);
    
  if (error) throw error;
  return true;
}

/**
 * STORAGE & UTILS
 */

export async function getEvidenceUrls(paths: string[]) {
  if (!paths || paths.length === 0) return [];
  
  // Generates signed URLs for an array of evidence paths
  const { data, error } = await supabase.storage
    .from('evidence')
    .createSignedUrls(paths, 3600); // 1 hour expiry

  if (error) throw error;
  return data.map(item => item.signedUrl);
}