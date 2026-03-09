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

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !chatId) return;
    setSending(true);
    await sendMessage(chatId, input.trim());
    setInput('');
    setSending(false);
    inputRef.current?.focus();
  }

  return (
    <div className="border rounded-lg bg-white flex flex-col max-h-96">
      <div className="p-2 border-b font-semibold">Chat</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ minHeight: 120 }}>
        {loading ? (
          <div className="text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-sm">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={uid === m.sender_id ? 'text-right' : 'text-left'}>
              <div className="inline-flex items-center gap-2">
                {uid !== m.sender_id && (
                  <Avatar src={m.sender?.avatar_url} alt={m.sender?.username || 'User'} size={24} />
                )}
                <span className="bg-gray-100 rounded px-2 py-1 text-sm inline-block max-w-xs break-words">
                  {m.message}
                </span>
                {uid === m.sender_id && (
                  <Avatar src={m.sender?.avatar_url} alt={m.sender?.username || 'You'} size={24} />
                )}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {m.sender?.username || 'User'} • {new Date(m.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="flex border-t p-2 gap-2">
        <input
          ref={inputRef}
          className="input flex-1"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
          maxLength={2000}
        />
        <button className="btn btn-primary" type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
