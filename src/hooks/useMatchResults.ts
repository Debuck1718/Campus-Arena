import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export async function fetchMatchResults(matchId: string) {
  const { data, error } = await supabase
    .from('match_results')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export function useMatchResults(matchId?: string) {
  return useQuery({
    queryKey: ['matchResults', matchId],
    queryFn: () => fetchMatchResults(matchId!),
    enabled: !!matchId
  });
}
