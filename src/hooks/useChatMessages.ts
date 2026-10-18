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

export interface ChatRoomState {
  closed_at: string | null;
  closed_reason: string | null;
}

export function useChatMessages(chatId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // A match chat is closed once its evidence is approved or the match is
  // disputed (migration 0021). Closed channels are read-only.
  const [chatState, setChatState] = useState<ChatRoomState | null>(null);

  async function fetchChatState(activeChatId: string) {
    const { data } = await supabase
      .from('chats')
      .select('closed_at, closed_reason')
      .eq('id', activeChatId)
      .maybeSingle();
    setChatState((data as ChatRoomState) ?? null);
  }

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
      setChatState(null);
      return;
    }

    fetchMessages(chatId);
    fetchChatState(chatId);

    // Realtime updates for the message box lifecycle itself: when admins
    // approve evidence or a dispute is raised (migration 0021) the row in
    // `chats` flips to closed, so every open message box locks instantly
    // without a refresh.
    const stateChannel = supabase
      .channel(`chat_state:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `id=eq.${chatId}`,
        },
        (payload) => {
          const row = payload.new as { closed_at: string | null; closed_reason: string | null };
          setChatState({ closed_at: row.closed_at, closed_reason: row.closed_reason });
        }
      )
      .subscribe();

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
      supabase.removeChannel(stateChannel);
    };
  }, [chatId]);

  async function sendMessage(idOfChat: string, textContent: string) {
    const cleanText = textContent.trim();
    if (!idOfChat || !cleanText) return;

    if (chatState?.closed_at) {
      throw new Error('This message box is closed because the match has been finalized.');
    }

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

  return { messages, loading, sendMessage, chatState, isClosed: Boolean(chatState?.closed_at) };
}