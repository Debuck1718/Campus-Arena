import React, { useRef, useState } from 'react';
import { useChatMessages } from '../hooks/useChatMessages';
import { Avatar } from './ui';
import { supabase } from '../supabaseClient';

export function Chat({ chatId }: { chatId: string | undefined }) {
  const { messages, loading, sendMessage } = useChatMessages(chatId);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Get current authenticated user ID
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // Auto-scroll to the newest message whenever new data flows in
  React.useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    if (chatId) {
      inputRef.current?.focus();
    }
  }, [chatId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const cleanInput = input.trim();

    // Guardrail: Explicitly blocks empty entries from hitting Postgres check constraint
    if (!cleanInput || !chatId) return;

    setSending(true);
    try {
      await sendMessage(chatId, cleanInput);
      setInput('');
    } catch (err) {
      console.error('Failed to dispatch message payload:', err);
    } finally {
      setSending(false);
      // Re-focus immediately for seamless rapid typing
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  return (
    <div className="border border-gray-800 rounded-xl bg-gray-950 flex flex-col max-h-[450px] shadow-2xl overflow-hidden">
      {/* Header element */}
      <div className="p-3 border-b border-gray-800 bg-gray-900/50 font-bold tracking-wide text-gray-200 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          Match Arena Chat
        </span>
      </div>

      {/* Message History Space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-800" style={{ minHeight: 200 }}>
        {loading ? (
          <div className="text-gray-500 text-sm animate-pulse text-center py-4">Syncing secure channel records...</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-600 text-sm text-center py-8">
            No transmissions yet. Break the ice and coordinate your match lobby!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = uid === m.sender_id;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar 
                    src={m.sender?.avatar_url} 
                    alt={m.sender?.username || (isMe ? 'You' : 'Opponent')} 
                    size={28} 
                    className="border border-gray-800 shadow"
                  />
                  <div 
                    className={`rounded-2xl px-3.5 py-2 text-sm break-words shadow-md ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-none font-medium' 
                        : 'bg-gray-900 text-gray-100 border border-gray-800 rounded-bl-none'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
                {/* Message Meta details */}
                <div className="text-[10px] text-gray-500 mt-1 px-9 font-mono tracking-tight">
                  {!isMe && <span className="text-gray-400 font-sans mr-1">{m.sender?.username || 'Player'} •</span>}
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Interactive Chat Form Layout */}
      <form onSubmit={handleSend} className="flex border-t border-gray-800 p-3 bg-gray-900/30 gap-2 items-center">
        <input
          ref={inputRef}
          className="flex-1 bg-gray-900 border border-gray-800 text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-600 transition-all disabled:opacity-50"
          placeholder="Transmit a tactical message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
          maxLength={2000}
          autoComplete="off"
        />
        <button 
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white disabled:text-gray-600 font-bold px-4 py-2.5 rounded-lg text-sm transition-all duration-200 active:scale-95 shadow-md flex items-center" 
          type="submit" 
          disabled={sending || !input.trim()}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}