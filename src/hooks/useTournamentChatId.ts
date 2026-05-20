import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useTournamentChatId(tournamentId: string | undefined) {
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    async function fetchOrCreate() {
      // Try to find existing chat for this tournament
      const { data, error } = await supabase
        .from('chats')
        .select('id')
        .eq('scope', 'tournament')
        .eq('tournament_id', tournamentId)
        .single();
      if (data?.id) {
        if (!cancelled) setChatId(data.id);
      } else {
        // Create if not exists
        const { data: created, error: createErr } = await supabase
          .from('chats')
          .insert({ scope: 'tournament', tournament_id: tournamentId })
          .select('id')
          .single();
        if (created?.id && !cancelled) setChatId(created.id);
      }
    }
    fetchOrCreate();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);
  return chatId;
}
