import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { getSignedUrls } from '../lib/storage';

/**
 * Fetches all submitted results for a match and resolves each evidence file to
 * a signed URL.
 *
 * Production note (verified 2026-10-02): proof lives in the private `evidence`
 * bucket and `screenshot_url` holds an OBJECT PATH like
 * "<match_id>/<timestamp>.jpg". This previously signed against a
 * `match-screenshots` bucket that does not exist, so no proof ever rendered.
 */
export interface MatchResultRow {
  id: string;
  match_id: string;
  screenshot_url: string | null;
  [key: string]: unknown;
}

export async function fetchMatchResults(matchId: string): Promise<MatchResultRow[]> {
  const { data, error } = await supabase
    .from('match_results')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const results = (data || []) as MatchResultRow[];
  const paths = results
    .map((item) => item.screenshot_url)
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    const signedMap = await getSignedUrls(paths);

    return results.map((item) => ({
      ...item,
      screenshot_url: item.screenshot_url
        ? signedMap[item.screenshot_url] || item.screenshot_url
        : null,
    }));
  }

  return results;
}

export function useMatchResults(matchId?: string) {
  return useQuery({
    queryKey: ['matchResults', matchId],
    queryFn: () => fetchMatchResults(matchId!),
    enabled: !!matchId
  });
}
