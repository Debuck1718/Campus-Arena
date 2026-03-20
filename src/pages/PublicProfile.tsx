import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card, Avatar, Button } from '../components/ui';
import { 
  Trophy, 
  Gamepad2, 
  Swords, 
  TrendingUp, 
  ArrowLeft, 
  Share2, 
  ShieldCheck,
  History
} from 'lucide-react';

interface ProfileData {
  username: string;
  platform: string[];
  avatar_url: string;
  bio?: string;
}

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [stats, setStats] = React.useState({ wins: 0, losses: 0, points: 0 });
  const [matches, setMatches] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function getProfileData() {
      if (!id) return;
      setLoading(true);
      
      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('username, platform, avatar_url, bio')
        .eq('id', id)
        .single();

      if (profileErr) {
        setErr("Operative not found in database");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // 2. Fetch Stats from Rankings
      const { data: ranking } = await supabase
        .from('rankings')
        .select('wins, losses, points')
        .eq('player_id', id)
        .single();
      
      if (ranking) setStats(ranking);

      // 3. Fetch Recent Matches
      const { data: history } = await supabase
        .from('matches')
        .select('id, created_at, status, tournaments(name)')
        .or(`player1_id.eq.${id},player2_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (history) setMatches(history);
      
      setLoading(false);
    }
    getProfileData();
  }, [id]);

  const winRate = stats.wins + stats.losses > 0 
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) 
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-blue-500 font-black tracking-[0.4em] animate-pulse text-xs uppercase">Analyzing Combatant...</div>
    </div>
  );

  if (err || !profile) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
        <ShieldCheck size={32} />
      </div>
      <h2 className="text-xl font-black uppercase italic text-white tracking-tighter">Profile Offline</h2>
      <p className="text-gray-500 text-sm mt-2">{err || "The requested operative is currently unavailable."}</p>
      <Button onClick={() => nav(-1)} className="mt-8 bg-gray-900 border-gray-800 text-xs font-black uppercase tracking-widest">Back to Arena</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-10 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="container max-w-4xl mx-auto px-4 pt-12 relative z-10">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center mb-10">
          <button onClick={() => nav(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back</span>
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Profile link copied!");
            }}
            className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* --- PROFILE HEADER CARD --- */}
        <Card className="bg-[#0a0a0c] border-gray-800 p-0 rounded-[2.5rem] overflow-hidden shadow-2xl mb-8">
          <div className="h-32 bg-gradient-to-r from-blue-900/40 via-blue-600/20 to-black relative">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          </div>
          
          <div className="px-8 pb-10">
            <div className="relative -mt-16 flex flex-col items-center md:flex-row md:items-end md:gap-8 mb-8">
              <div className="relative">
                <Avatar src={profile.avatar_url} alt={profile.username} size={140} className="border-8 border-[#0a0a0c] shadow-2xl" />
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center border-4 border-[#0a0a0c] text-white">
                  <Trophy size={18} />
                </div>
              </div>
              
              <div className="mt-6 text-center md:text-left flex-1">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white leading-none">
                    {profile.username}
                  </h1>
                </div>
                <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2 flex items-center justify-center md:justify-start gap-2">
                  <ShieldCheck size={12} /> Elite Tier Competitor
                </p>
              </div>
            </div>

            {/* Career Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-900 pt-8">
              <StatItem label="Combat Points" value={stats.points.toLocaleString()} icon={<TrendingUp size={14}/>} />
              <StatItem label="Win Rate" value={`${winRate}%`} icon={<Trophy size={14}/>} />
              <StatItem label="Total Wins" value={stats.wins} icon={<Swords size={14}/>} color="text-green-500" />
              <StatItem label="Platforms" value={profile.platform?.length || 0} icon={<Gamepad2 size={14}/>} />
            </div>
          </div>
        </Card>

        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* About/Bio Section */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#0a0a0c] border border-gray-800 p-6 rounded-3xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-4 flex items-center gap-2">
                About Operative
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium italic">
                {profile.bio || "No combat record summary provided by this operative."}
              </p>
              
              <div className="mt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-4">Active Zones</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.platform?.map(p => (
                    <span key={p} className="px-3 py-1.5 bg-blue-600/5 border border-blue-500/20 text-blue-500 text-[9px] font-black uppercase rounded-lg">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Latest Match History */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4 flex items-center gap-2">
              <History size={14} /> Combat Record (Latest)
            </h3>
            
            <div className="space-y-3">
              {matches.length > 0 ? matches.map((m) => (
                <div key={m.id} className="bg-[#0a0a0c] border border-gray-800/40 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black border border-gray-800 rounded-lg flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Swords size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase italic tracking-tight text-white">{m.tournaments?.name || 'Tournament Battle'}</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{new Date(m.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-blue-400 opacity-50">
                    {m.status}
                  </span>
                </div>
              )) : (
                <div className="py-12 text-center border-2 border-dashed border-gray-900 rounded-3xl opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-widest">No recent engagements</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Internal Helper for Stats
function StatItem({ label, value, icon, color = "text-white" }: any) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-600">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">{label}</span>
      </div>
      <p className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}