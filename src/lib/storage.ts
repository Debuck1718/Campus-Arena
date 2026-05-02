import { supabase } from '../supabaseClient';

const AVATARS_BUCKET = 'avatars';
const MATCH_EVIDENCE_BUCKET = 'match-screenshots';

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type
  });
  if (error) throw error;

  // Generate a signed URL valid for 7 days
  const { data: signed, error: urlErr } = await supabase.storage
    .from(AVATARS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (urlErr) throw urlErr;

  return signed?.signedUrl || '';
}

export async function uploadMatchEvidence(file: File, matchId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${matchId}/${Date.now()}.${safeExt}`;

  const { error } = await supabase.storage.from(MATCH_EVIDENCE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type
  });
  if (error) throw error;

  return path;
}

export async function getSignedUrl(path: string, expires = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(MATCH_EVIDENCE_BUCKET)
    .createSignedUrl(path, expires);
  if (error) {
    console.error('Failed to generate signed URL:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

export async function getSignedUrls(
  paths: string[],
  expires = 3600
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage
    .from(MATCH_EVIDENCE_BUCKET)
    .createSignedUrls(paths, expires);

  if (error) {
    console.error('Failed to generate signed URLs:', error.message);
    return {};
  }

  return (data || []).reduce((acc: Record<string, string>, item: any) => {
    if (item.path && item.signedUrl) acc[item.path] = item.signedUrl;
    return acc;
  }, {});
}
