import { supabase } from '../supabaseClient';

const AVATARS_BUCKET = 'avatars';

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
  const { data: signed, error: urlErr } = await supabase.storage.from(AVATARS_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (urlErr) throw urlErr;

  return signed?.signedUrl || '';
}