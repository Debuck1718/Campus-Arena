import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export async function fetchMatchResults(matchId: string) {
  const { data, error } = await supabase
    .from('match_results')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const results = data || [];
  const paths = results.map((item: any) => item.screenshot_url).filter(Boolean);

  if (paths.length > 0) {
    const { data: signedUrls, error: urlError } = await supabase.storage
      .from('match-screenshots')
      .createSignedUrls(paths, 3600);

    if (!urlError && signedUrls) {
      const urlMap = new Map<string, string>(
        signedUrls.map((item: any) => [item.path, item.signedUrl])
      );
      return results.map((item: any) => ({
        ...item,
        screenshot_url: item.screenshot_url
          ? urlMap.get(item.screenshot_url) || item.screenshot_url
          : null
      }));
    }
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
