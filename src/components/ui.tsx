import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
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

export function SectionTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-xl font-semibold ${className}`}>
      {children}
    </h2>
  );
}

export function Avatar({
  src,
  alt,
  size = 32,
  className = "", // Added className prop
}: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string; // Added to type definition
}) {
  const fallback = alt?.[0]?.toUpperCase() || '?';

  // Base classes for both image and fallback
  const baseClasses = `rounded-full object-cover shrink-0 ${className}`;

  return src ? (
    <img
      src={src}
      alt={alt}
      style={{ width: size, height: size }}
      className={`${baseClasses} border border-gray-800`} // Updated to a darker border for the gaming theme
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className={`${baseClasses} bg-gray-800 text-gray-400 flex items-center justify-center text-sm font-bold border border-gray-700`}
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

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/tournaments', label: 'Tournaments' },
    { to: '/leaderboard', label: 'Rankings' },
    { to: '/tournaments/create', label: 'Create' },
    { to: '/support', label: 'Support' },
    { to: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-[#05060f]/90 backdrop-blur border-b border-white/10">
      <div className="container flex items-center gap-4 py-3">
        <Link
          to="/"
          className="font-black text-white tracking-tight shrink-0 hover:text-cyan-300 transition-colors"
        >
          Campus<span className="text-cyan-400">Arena</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1 ml-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                clsx(
                  'px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto hidden lg:flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              className="relative p-2 rounded-full text-slate-200 hover:bg-white/10 transition-colors"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <Bell size={18} />
              {notifications.filter((n) => !n.read_at).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {notifications.filter((n) => !n.read_at).length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-[#0a0c18] border border-white/10 shadow-2xl z-50">
                <div className="p-3 border-b border-white/10 font-bold text-slate-100">
                  Notifications
                </div>

                {loading ? (
                  <div className="p-3 text-slate-400">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-3 text-slate-400">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={clsx(
                        'px-4 py-2.5 text-sm border-b border-white/5 last:border-b-0 flex justify-between items-center gap-3',
                        !n.read_at ? 'bg-cyan-500/10' : 'bg-transparent'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 capitalize">
                          {n.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>

                      {!n.read_at && (
                        <button
                          className="shrink-0 text-[11px] font-bold text-cyan-300 hover:underline"
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

          <Link to="/profile" title="Your profile" className="flex items-center gap-2 shrink-0">
            <Avatar src={avatarUrl} alt={username} size={30} />
            <span className="text-sm font-semibold text-slate-200 max-w-24 truncate">
              {username}
            </span>
          </Link>

          {onLogout && (
            <Button onClick={onLogout} variant="outline" className="border-white/15 text-slate-200">
              Logout
            </Button>
          )}
        </div>

        <button
          className="lg:hidden ml-auto inline-flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-100"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden w-full bg-[#05060f] border-t border-white/10">
          <div className="container flex flex-col gap-1 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                    isActive ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}

            <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 min-w-0"
              >
                <Avatar src={avatarUrl} alt={username} size={30} />
                <span className="text-sm font-semibold text-slate-200 truncate">{username}</span>
              </Link>

              {onLogout && (
                <Button onClick={onLogout} variant="outline" className="border-white/15 text-slate-200">
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}