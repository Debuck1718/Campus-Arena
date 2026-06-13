import React from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, Avatar } from '../components/ui';
import { uploadAvatar } from '../lib/storage';
import {
  User,
  Gamepad2,
  ShieldCheck,
  History,
  TrendingUp,
  Swords,
  Camera,
  Save,
  CheckCircle2,
  Medal,
  Lock,
  Trophy,
} from 'lucide-react';

interface MatchHistoryItem {
  id: string;
  created_at: string;
  status: string;
  winner_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  tournaments?: { name?: string } | null;
  games?: { name?: string } | null;
}

interface StatMiniProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
}

const BADGE_MAP: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  tournament_champion: {
    label: 'Grand Champion',
    desc: 'Took 1st place in a major circuit.',
    icon: <ShieldCheck size={24} className="text-yellow-400" />,
  },
  first_win: {
    label: 'First Blood',
    desc: 'Secured your first match victory.',
    icon: <Swords size={24} className="text-blue-400" />,
  },
  power_user: {
    label: 'Veteran',
    desc: 'Participated in 10+ tournaments.',
    icon: <TrendingUp size={24} className="text-purple-400" />,
  },
};

export function Profile() {
  const [username, setUsername] = React.useState('');
  const [platforms, setPlatforms] = React.useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({ wins: 0, losses: 0, points: 0, matches_played: 0 });
  const [matches, setMatches] = React.useState<MatchHistoryItem[]>([]);
  const [achievements, setAchievements] = React.useState<string[]>([]);

  const availablePlatforms = ['PlayStation', 'Xbox', 'PC', 'Mobile'];

  React.useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: sess } = await supabase.auth.getUser();
    const id = sess.user?.id || null;
    setUid(id);

    if (!id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profile) {
      setUsername(profile.username || '');
      setPlatforms(Array.isArray(profile.platform) ? profile.platform : []);
      setAvatarUrl(profile.avatar_url || '');
    }

    const { data: ranking } = await supabase
      .from('rankings')
      .select('wins, losses, points, matches_played')
      .eq('profile_id', id)
      .maybeSingle();

    if (ranking) {
      setStats({
        wins: ranking.wins || 0,
        losses: ranking.losses || 0,
        points: ranking.points || 0,
        matches_played: ranking.matches_played || 0,
      });
    }

    const { data: history } = await supabase
      .from('matches')
      .select(`
        id,
        created_at,
        status,
        winner_id,
        player1_id,
        player2_id,
        tournaments (
          name
        ),
        games (
          name
        )
      `)
      .or(`player1_id.eq.${id},player2_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(8);

    setMatches((history || []) as MatchHistoryItem[]);

    const earnedBadges: string[] = [];
    if ((ranking?.wins || 0) >= 1) earnedBadges.push('first_win');
    if ((ranking?.matches_played || 0) >= 10) earnedBadges.push('power_user');
    setAchievements(earnedBadges);
  }

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((i) => i !== p) : [...prev, p]));
  };

  async function save() {
    setMsg(null);

    if (!uid) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        platform: platforms,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', uid);

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !uid) return;

    setUploading(true);

    try {
      const url = await uploadAvatar(f, uid);
      setAvatarUrl(url);
      setMsg({ type: 'success', text: 'Avatar uploaded. Save to apply.' });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#03040a] text-gray-100 pb-20 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.12),transparent_30%),linear-gradient(to_bottom,#03040a,#050505)]" />

      <div className="container max-w-6xl mx-auto px-4 pt-12 relative z-10">
        <header className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/30 border border-blue-500/20 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={140} />
          </div>

          <div className="relative group">
            <Avatar
              src={avatarUrl}
              alt={username}
              size={120}
              className="border-4 border-blue-500/50 shadow-2xl shadow-blue-600/20"
            />

            <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
              <Camera size={16} />
              <input id="avatar-upload" type="file" hidden accept="image/*" onChange={onFileChange} />
            </label>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter text-white">
                {username || 'New Recruit'}
              </h1>
              <CheckCircle2 size={20} className="text-blue-400" />
            </div>

            <p className="text-gray-300 font-bold text-xs uppercase tracking-widest mb-6">
              Pro League Member • Ranked Competitor
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <StatMini icon={<TrendingUp size={14} />} label="Points" value={stats.points} color="text-blue-300" />
              <StatMini icon={<Swords size={14} />} label="Wins" value={stats.wins} color="text-green-300" />
              <StatMini icon={<Trophy size={14} />} label="Played" value={stats.matches_played} color="text-cyan-300" />
              <StatMini icon={<Medal size={14} />} label="Badges" value={achievements.length} color="text-yellow-300" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4 flex items-center gap-2">
                <User size={14} /> Profile Settings
              </h3>

              <Card className="bg-gray-950/80 border-gray-800 p-6 rounded-2xl">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-2 block">
                      Display Handle
                    </label>

                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-black border-gray-700 text-white font-bold"
                    />
                  </div>

                  <Button
                    onClick={save}
                    disabled={uploading}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> {uploading ? 'Processing...' : 'Sync Profile'}
                  </Button>

                  {msg && (
                    <div className={`p-3 rounded-xl text-[10px] font-black uppercase text-center border ${
                      msg.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30 text-green-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                </div>
              </Card>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mb-4">
                Network Platforms
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {availablePlatforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`p-3 rounded-xl border transition-all text-[10px] font-black uppercase flex items-center gap-2 ${
                      platforms.includes(p)
                        ? 'bg-blue-600/15 border-blue-500 text-white'
                        : 'bg-black/50 border-gray-800 text-gray-300'
                    }`}
                  >
                    <Gamepad2 size={12} /> {p}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-12">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6 flex items-center gap-2">
                <Medal size={14} /> Achievement Showcase
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(BADGE_MAP).map(([key, info]) => {
                  const isEarned = achievements.includes(key);

                  return (
                    <div
                      key={key}
                      className={`relative p-5 rounded-2xl border transition-all overflow-hidden ${
                        isEarned
                          ? 'bg-gray-950/80 border-blue-500/30'
                          : 'bg-black/30 border-white/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gray-900 border border-white/10">
                          {isEarned ? info.icon : <Lock size={20} className="text-gray-500" />}
                        </div>

                        <div>
                          <h4 className="text-sm font-black uppercase italic tracking-tight text-white">
                            {info.label}
                          </h4>
                          <p className="text-[10px] text-gray-300 font-bold leading-tight mt-1">
                            {info.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 mb-6 flex items-center gap-2">
                <History size={14} /> Combat Log
              </h3>

              <div className="space-y-3">
                {matches.length > 0 ? (
                  matches.map((m) => {
                    const result =
                      m.status === 'completed'
                        ? m.winner_id === uid
                          ? 'Win'
                          : 'Loss'
                        : m.status;

                    return (
                      <div key={m.id} className="bg-gray-950/80 border border-gray-800 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-blue-500/40 transition-all">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-300">
                            <Swords size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-sm uppercase tracking-tight text-white truncate">
                              {m.tournaments?.name || m.games?.name || 'Friendly Match'}
                            </p>
                            <p className="text-[10px] text-gray-300 font-black uppercase">
                              {new Date(m.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${
                          result === 'Win'
                            ? 'bg-green-500/10 text-green-300'
                            : result === 'Loss'
                            ? 'bg-red-500/10 text-red-300'
                            : 'bg-blue-500/10 text-blue-300'
                        }`}>
                          {result}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-gray-800 rounded-3xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      No match records found
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatMini({ icon, label, value, color = 'text-white' }: StatMiniProps) {
  return (
    <div className="bg-black/50 border border-blue-500/20 px-4 py-3 rounded-xl flex items-center gap-3">
      <div className="text-blue-400">{icon}</div>
      <div>
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
          {label}
        </p>
        <p className={`text-sm font-black italic leading-none ${color}`}>
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}