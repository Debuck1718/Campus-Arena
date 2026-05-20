import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useFriendlyMatches(uid?: string) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select('id, player1_id, player2_id, winner_id, status, created_at')
        .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
        .is('tournament_id', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!cancelled) {
        if (!error && data) setMatches(data);
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
