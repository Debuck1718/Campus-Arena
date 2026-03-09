import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import clsx from 'clsx';
import { supabase } from '../supabaseClient';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }
) {
  const { className, variant = 'primary', ...rest } = props;
  return (
    <button
      className={clsx('btn', variant === 'primary' ? 'btn-primary' : 'btn-outline', className)}
      {...rest}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={clsx('input', className)} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select className={clsx('input', className)} {...rest}>
      {children}
    </select>
  );
}

export function Card({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={clsx('card', className)}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold mb-3">{children}</h2>;
}

export function Avatar({
  src,
  alt,
  size = 32
}: {
  src?: string | null;
  alt: string;
  size?: number;
}) {
  const fallback = alt?.[0]?.toUpperCase() || '?';
  return src ? (
    <img
      src={src}
      alt={alt}
      style={{ width: size, height: size }}
      className="rounded-full object-cover border border-gray-200"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium"
    >
      {fallback}
    </div>
  );
}

export function Navbar({ onLogout }: { onLogout?: () => void }) {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string>('U');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const { notifications, loading, markAsRead } = useNotifications();

  React.useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', uid)
        .single();
      if (data) {
        setUsername(data.username || 'U');
        setAvatarUrl(data.avatar_url || null);
      }
    })();
  }, []);

  return (
    <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="container flex items-center gap-4 py-3">
        <a href="/" className="font-bold text-primary-600">
          CampusArena
        </a>
        <div className="hidden sm:flex items-center gap-4 ml-6">
          <a href="/dashboard" className="text-gray-700 hover:text-primary-600">
            Dashboard
          </a>
          <a href="/tournaments" className="text-gray-700 hover:text-primary-600">
            Tournaments
          </a>
          <a href="/tournaments/create" className="text-gray-700 hover:text-primary-600">
            Create
          </a>
          <a href="/profile" className="text-gray-700 hover:text-primary-600">
            Profile
          </a>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              className="relative p-2 rounded-full hover:bg-gray-100"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <span role="img" aria-label="bell">🔔</span>
              {notifications.filter((n) => !n.read_at).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1.5">
                  {notifications.filter((n) => !n.read_at).length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b font-semibold">Notifications</div>
                {loading ? (
                  <div className="p-3 text-gray-500">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-3 text-gray-500">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={clsx(
                        'px-4 py-2 text-sm border-b last:border-b-0 flex justify-between items-center',
                        !n.read_at ? 'bg-blue-50' : 'bg-white'
                      )}
                    >
                      <div>
                        <div className="font-medium">{n.type.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.read_at && (
                        <button
                          className="text-xs text-primary-600 hover:underline ml-2"
                          onClick={() => markAsRead(n.id)}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <a href="/profile" title="Your profile" className="flex items-center gap-2">
            <Avatar src={avatarUrl} alt={username} size={28} />
            <span className="hidden sm:inline text-sm text-gray-700">{username}</span>
          </a>
          {onLogout && (
            <Button onClick={onLogout} className="hidden sm:inline-flex">
              Logout
            </Button>
          )}
        </div>
        <button
          className="sm:hidden ml-auto btn btn-outline px-3 py-1.5"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
      </div>
      {menuOpen && (
        <div className="sm:hidden w-full bg-white border-t border-b border-gray-200">
          <div className="container flex flex-col gap-3 py-3">
            <a href="/dashboard" className="text-gray-700 hover:text-primary-600">
              Dashboard
            </a>
            <a href="/tournaments" className="text-gray-700 hover:text-primary-600">
              Tournaments
            </a>
            <a href="/tournaments/create" className="text-gray-700 hover:text-primary-600">
              Create
            </a>
            <a href="/profile" className="text-gray-700 hover:text-primary-600">
              Profile
            </a>
            <div className="flex items-center justify-between pt-2">
              <a href="/profile" title="Your profile" className="flex items-center gap-2">
                <Avatar src={avatarUrl} alt={username} size={28} />
                <span className="text-sm text-gray-700">{username}</span>
              </a>
              {onLogout && <Button onClick={onLogout}>Logout</Button>}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}