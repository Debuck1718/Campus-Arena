import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

export type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: { username?: string; avatar_url?: string };
};

export function useChatMessages(chatId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    let sub: any;
    async function fetchMessages() {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(username,avatar_url)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (!error && data) setMessages(data);
      setLoading(false);
    }
    fetchMessages();
    sub = supabase
      .channel('chat-messages-' + chatId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();
    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, [chatId]);

  async function sendMessage(chatId: string, message: string) {
    await supabase.from('chat_messages').insert({ chat_id: chatId, message });
  }

  return { messages, loading, sendMessage };
}
