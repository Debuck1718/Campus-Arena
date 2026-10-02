import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export interface FriendlyMatch {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
  created_at: string;
  game?: { name?: string | null } | null;
}

export function useFriendlyMatches(uid?: string) {
  const [matches, setMatches] = useState<FriendlyMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          player1_id,
          player2_id,
          winner_id,
          status,
          created_at,
          game:games ( name )
        `)
        .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
        .is('tournament_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!cancelled) {
        if (!error && data) {
          setMatches(
            ((data || []) as unknown as FriendlyMatch[]).map((m) => ({
              ...m,
              game: Array.isArray(m.game) ? (m.game[0] ?? null) : m.game ?? null,
            }))
          );
        }
        setLoading(false);
      }
    }
    fetch();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { matches, loading };
}
