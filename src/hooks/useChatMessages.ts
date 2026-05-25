import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: {
    username: string;
    avatar_url: string;
  };
}

export function useChatMessages(chatId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Fetch initial historical messages for this chat room
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          chat_id,
          sender_id,
          message,
          created_at,
          sender:profiles (
            username,
            avatar_url
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat history:', error.message);
      } else {
        // Map out single items safely matching our interface structure
        setMessages((data as any[]) || []);
      }
      setLoading(false);
    }

    fetchMessages();

    // 2. Listen to real-time additions to this chat room
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

          // Fetch sender profile details to attach immediately to the message bubble
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          if (profileData) {
            newMessage.sender = {
              username: profileData.username,
              avatar_url: profileData.avatar_url,
            };
          }

          // Append newly received message to state
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    // Clean up channel listener when moving out of the chat context
    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [chatId]);

  // 3. Send a message to the database
  async function sendMessage(idOfChat: string, textContent: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('chat_messages').insert({
      chat_id: idOfChat,
      sender_id: user.id,
      message: textContent,
    });

    if (error) {
      console.error('Failed to submit message payload:', error.message);
      throw error;
    }
  }

  return { messages, loading, sendMessage };
}