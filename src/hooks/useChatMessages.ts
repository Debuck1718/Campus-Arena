import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

type RawChatMessage = Omit<ChatMessage, 'sender'> & {
  sender?:
    | {
        username: string | null;
        avatar_url: string | null;
      }
    | {
        username: string | null;
        avatar_url: string | null;
      }[]
    | null;
};

function normalizeMessage(row: RawChatMessage): ChatMessage {
  return {
    ...row,
    sender: Array.isArray(row.sender) ? row.sender[0] ?? null : row.sender ?? null,
  };
}

export function useChatMessages(chatId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchMessages(activeChatId: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        chat_id,
        sender_id,
        message,
        created_at,
        sender:profiles!chat_messages_sender_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('chat_id', activeChatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat history:', error.message);
      setMessages([]);
    } else {
      const normalized = ((data || []) as RawChatMessage[]).map(normalizeMessage);
      setMessages(normalized);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    fetchMessages(chatId);

    const chatChannel = supabase
      .channel(`chat_room:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          newMessage.sender = profileData || null;

          setMessages((prev) => {
            if (prev.some((msg) => msg.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [chatId]);

  async function sendMessage(idOfChat: string, textContent: string) {
    const cleanText = textContent.trim();
    if (!idOfChat || !cleanText) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase.from('chat_messages').insert({
      chat_id: idOfChat,
      sender_id: user.id,
      message: cleanText,
    });

    if (error) {
      console.error('Failed to submit message payload:', error.message);
      throw error;
    }
  }

  return { messages, loading, sendMessage };
}