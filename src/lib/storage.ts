import { supabase } from '../supabaseClient';

/**
 * Bucket names verified against production on 2026-10-02 via
 * GET /storage/v1/bucket (service role):
 *   evidence -> private, allowed: image/jpeg, image/png, video/mp4
 *   avatars  -> private, allowed: image/jpeg, image/png, 20MB cap
 *
 * The README previously documented a `match-screenshots` bucket; that bucket
 * does not exist. All match proof lives in `evidence`.
 */
const AVATARS_BUCKET = 'avatars';
const MATCH_EVIDENCE_BUCKET = 'evidence';

/**
 * `match_results.screenshot_url` stores a bucket OBJECT PATH
 * (e.g. "<match_id>/<timestamp>.jpg"). Some rows hold a full storage URL
 * (signed or public) instead. Normalise both forms back to an object path so we
 * always sign against the correct bucket + key.
 */
export function getEvidencePath(value: string | null | undefined): string {
  if (!value) return '';
  if (!value.startsWith('http')) return value;

  try {
    const url = new URL(value);
    const signedMarker = `/storage/v1/object/sign/${MATCH_EVIDENCE_BUCKET}/`;
    const publicMarker = `/storage/v1/object/public/${MATCH_EVIDENCE_BUCKET}/`;

    if (url.pathname.includes(signedMarker)) {
      return decodeURIComponent(url.pathname.split(signedMarker)[1]);
    }
    if (url.pathname.includes(publicMarker)) {
      return decodeURIComponent(url.pathname.split(publicMarker)[1]);
    }
    return value;
  } catch {
    return value;
  }
}

/** True when a path is already directly usable in an <img src>. */
function isDirectUrl(value: string): boolean {
  return value.startsWith('http');
}

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

  // Now points securely to the 'evidence' bucket
  const { error } = await supabase.storage.from(MATCH_EVIDENCE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type
  });
  if (error) throw error;

  return path;
}

export async function getSignedUrl(path: string, expires = 3600): Promise<string | null> {
  const objectPath = getEvidencePath(path);
  if (!objectPath) return null;
  if (isDirectUrl(objectPath)) return objectPath;

  const { data, error } = await supabase.storage
    .from(MATCH_EVIDENCE_BUCKET)
    .createSignedUrl(objectPath, expires);
  if (error) {
    console.error('Failed to generate signed URL:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

/**
 * Batch-signs evidence paths.
 *
 * Keys of the returned map are the ORIGINAL input values (not the normalised
 * object paths), so callers can look up by whatever they passed in. Values that
 * are already absolute URLs are passed through untouched.
 */
export async function getSignedUrls(
  paths: string[],
  expires = 3600
): Promise<Record<string, string>> {
  if (!paths.length) return {};

  const out: Record<string, string> = {};
  const needsSigning: string[] = [];
  const originalFor = new Map<string, string>();

  for (const p of paths) {
    const norm = getEvidencePath(p);

    if (!norm) continue;

    if (isDirectUrl(norm)) {
      out[p] = norm;
    } else {
      needsSigning.push(norm);
      originalFor.set(norm, p);
    }
  }

  if (!needsSigning.length) return out;

  const { data, error } = await supabase.storage
    .from(MATCH_EVIDENCE_BUCKET)
    .createSignedUrls(needsSigning, expires);

  if (error) {
    console.error('Failed to generate signed URLs:', error.message);
    return out;
  }

  for (const item of (data || []) as { path: string; signedUrl?: string }[]) {
    if (!item.path || !item.signedUrl) continue;
    const original = originalFor.get(item.path);
    if (original) out[original] = item.signedUrl;
  }

  return out;
}