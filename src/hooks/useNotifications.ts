import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export type Notification = {
  id: string;
  type: string;
  payload: any;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', uid)
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
      setLoading(false);
    }
    fetchNotifications();
    // Subscribe to new notifications (Supabase Realtime)
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  }

  return { notifications, loading, markAsRead };
}

export function useToast() {
  return (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // For now, just console log. In production, integrate with a toast library
    console.log(`[${type.toUpperCase()}] ${message}`);
  };
}
