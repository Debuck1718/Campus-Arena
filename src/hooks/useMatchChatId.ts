import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useMatchChatId(matchId: string | undefined) {
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    async function fetchOrCreate() {
      // Try to find existing chat for this match, including its lifecycle state
      // so the UI can render the approved/disputed banner (migration 0021).
      const { data } = await supabase
        .from('chats')
        .select('id, closed_at, closed_reason')
        .eq('scope', 'match')
        .eq('match_id', matchId)
        .maybeSingle();
      if (data?.id) {
        if (!cancelled) setChatId(data.id);
      } else {
        // Create if not exists
        const { data: created } = await supabase
          .from('chats')
          .insert({ scope: 'match', match_id: matchId })
          .select('id')
          .single();
        if (created?.id && !cancelled) setChatId(created.id);
      }
    }
    fetchOrCreate();
    return () => {
      cancelled = true;
    };
  }, [matchId]);
  return chatId;
}
