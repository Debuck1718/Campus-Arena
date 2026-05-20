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
  Lock
} from 'lucide-react';

interface MatchHistoryItem {
  id: string;
  created_at: string;
  status: string;
  tournaments?: { name?: string };
}

interface StatMiniProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
}

// Achievement Configuration for UI Mapping
const BADGE_MAP: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  tournament_champion: {
    label: "Grand Champion",
    desc: "Took 1st place in a major circuit.",
    icon: <ShieldCheck size={24} className="text-yellow-500" />
  },
  first_win: {
    label: "First Blood",
    desc: "Secured your first match victory.",
    icon: <Swords size={24} className="text-blue-500" />
  },
  power_user: {
    label: "Veteran",
    desc: "Participated in 10+ tournaments.",
    icon: <TrendingUp size={24} className="text-purple-500" />
  }
};

export function Profile() {
  const [username, setUsername] = React.useState('');
  const [platforms, setPlatforms] = React.useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);

  // Stats & Achievements State
  const [stats, setStats] = React.useState({ wins: 0, losses: 0, points: 0 });
  const [matches, setMatches] = React.useState<MatchHistoryItem[]>([]);
  const [achievements, setAchievements] = React.useState<string[]>([]);

  const availablePlatforms = ['PlayStation', 'Xbox', 'PC', 'Mobile'];

  React.useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const id = sess.user?.id || null;
      setUid(id);
      if (!id) return;

      // 1. Fetch Profile Info
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (profile) {
        setUsername(profile.username || '');
        setPlatforms(Array.isArray(profile.platform) ? profile.platform : []);
        setAvatarUrl(profile.avatar_url || '');
      }

      // 2. Fetch Career Stats
      const { data: ranking } = await supabase.from('rankings').select('*').eq('player_id', id).single();
      if (ranking) setStats({ wins: ranking.wins, losses: ranking.losses, points: ranking.points });

      // 3. Fetch Recent Match History
      const { data: history } = await supabase
        .from('matches')
        .select(`id, created_at, status, tournaments (name)`)
        .or(`player1_id.eq.${id},player2_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(5) as { data: MatchHistoryItem[] | null; error: unknown };
      if (history) setMatches(history);

      // 4. Fetch Earned Achievements
      const { data: earned } = await supabase.from('achievements').select('badge_type').eq('player_id', id) as { data: { badge_type: string }[] | null; error: unknown };
      if (earned) setAchievements(earned.map((a) => a.badge_type));
    })();
  }, []);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((i) => i !== p) : [...prev, p]));
  };

  async function save() {
    setMsg(null);
    if (!uid) return;
    const { error } = await supabase
      .from('profiles')
      .update({ username, platform: platforms, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', uid);

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Identity updated successfully!' });
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
      setMsg({ type: 'success', text: 'Avatar uploaded! Save to apply.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setMsg({ type: 'error', text: message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 pt-12 relative z-10">

        {/* --- TOP SECTION: PLAYER CARD --- */}
        <header className="flex flex-col md:flex-row items-center gap-8 mb-12 bg-[#0a0a0c] border border-gray-800 p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={120} />
          </div>

          <div className="relative group">
            <Avatar src={avatarUrl} alt={username} size={120} className="border-4 border-blue-600 shadow-2xl shadow-blue-600/20" />
            <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
              <Camera size={16} />
              <input id="avatar-upload" type="file" hidden onChange={onFileChange} />
            </label>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">{username || 'New Recruit'}</h1>
              <CheckCircle2 size={20} className="text-blue-500" />
            </div>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-6">Pro League Member • Joined {new Date().getFullYear()}</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <StatMini icon={<TrendingUp size={14} />} label="Points" value={stats.points} />
              <StatMini icon={<Swords size={14} />} label="Wins" value={stats.wins} color="text-green-500" />
              <StatMini icon={<Medal size={14} />} label="Badges" value={achievements.length} color="text-yellow-500" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* --- LEFT COLUMN: SETTINGS --- */}
          <div className="lg:col-span-1 space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4 flex items-center gap-2">
                <User size={14} /> Profile Settings
              </h3>
              <Card className="bg-[#0a0a0c] border-gray-800 p-6 rounded-2xl">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Display Handle</label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-black border-gray-800 font-bold" />
                  </div>
                  <Button onClick={save} className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <Save size={18} /> {uploading ? 'Processing...' : 'Sync Profile'}
                  </Button>
                  {msg && <div className={`p-3 rounded-xl text-[10px] font-black uppercase text-center border ${msg.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-500' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>{msg.text}</div>}
                </div>
              </Card>
            </section>

            {/* PLATFORMS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">Network Platforms</h3>
              <div className="grid grid-cols-2 gap-2">
                {availablePlatforms.map((p) => (
                  <button key={p} onClick={() => togglePlatform(p)} className={`p-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 ${platforms.includes(p) ? 'bg-blue-600/10 border-blue-600 text-white' : 'bg-black/40 border-gray-800 text-gray-600'}`}>
                    <Gamepad2 size={12} /> {p}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* --- RIGHT COLUMN: ACHIEVEMENTS & HISTORY --- */}
          <div className="lg:col-span-2 space-y-12">

            {/* ACHIEVEMENT SHOWCASE */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6 flex items-center gap-2">
                <Medal size={14} /> Achievement Showcase
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(BADGE_MAP).map(([key, info]) => {
                  const isEarned = achievements.includes(key);
                  return (
                    <div key={key} className={`relative p-5 rounded-2xl border transition-all overflow-hidden ${isEarned ? 'bg-[#0a0a0c] border-blue-500/30' : 'bg-black/20 border-white/5 opacity-40'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-gray-900 border border-white/5 ${isEarned ? 'text-white' : 'text-gray-700'}`}>
                          {isEarned ? info.icon : <Lock size={20} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase italic tracking-tight">{info.label}</h4>
                          <p className="text-[10px] text-gray-500 font-bold leading-tight mt-1">{info.desc}</p>
                        </div>
                      </div>
                      {isEarned && (
                        <div className="absolute -bottom-1 -right-1 opacity-10">
                          <CheckCircle2 size={60} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* MATCH HISTORY */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 flex items-center gap-2">
                <History size={14} /> Combat Log
              </h3>
              <div className="space-y-3">
                {matches.length > 0 ? matches.map((m) => (
                  <div key={m.id} className="bg-[#0a0a0c] border border-gray-800/50 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Swords size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-tight">{m.tournaments?.name || 'Tournament Match'}</p>
                        <p className="text-[10px] text-gray-600 font-black uppercase">{new Date(m.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${m.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {m.status}
                    </span>
                  </div>
                )) : (
                  <div className="py-12 text-center border-2 border-dashed border-gray-900 rounded-3xl opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-widest">No match records found</p>
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
    <div className="bg-black/40 border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
      <div className="text-blue-500">{icon}</div>
      <div>
        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className={`text-sm font-black italic leading-none ${color}`}>{value.toLocaleString()}</p>
      </div>
    </div>
  );
}