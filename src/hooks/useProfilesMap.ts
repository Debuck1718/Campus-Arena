import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

async function fetchProfiles(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

export function useProfilesMap(ids: (string | null | undefined)[]) {
  const uniq = Array.from(new Set(ids.filter(Boolean) as string[]));
  const { data } = useQuery({
    queryKey: ['profilesMap', uniq.sort().join(',')],
    queryFn: () => fetchProfiles(uniq),
    enabled: uniq.length > 0
  });
  const nameMap = new Map<string, string>();
  const avatarMap = new Map<string, string | null>();
  data?.forEach((p: any) => {
    nameMap.set(p.id, p.username);
    avatarMap.set(p.id, p.avatar_url || null);
  });
  return { nameMap, avatarMap };
}