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
    let sub: any;
    async function fetchNotifications() {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
      setLoading(false);
    }
    fetchNotifications();
    // Subscribe to new notifications (Supabase Realtime)
    sub = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          fetchNotifications();
        }
      )
      .subscribe();
    return () => {
      if (sub) supabase.removeChannel(sub);
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
