import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

async function getMatch(matchId: string) {
  const { data: m, error } = await supabase
    .from('matches')
    .select('*, tournaments(name)')
    .eq('id', matchId)
    .single();
  if (error) throw error;
  return m;
}

export function useMatch(matchId?: string) {
  return useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getMatch(matchId!),
    enabled: !!matchId
  });
}