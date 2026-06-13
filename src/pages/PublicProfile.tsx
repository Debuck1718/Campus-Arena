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
  History,
  Medal,
  Star,
  Flame,
  Crown,
} from 'lucide-react';

interface ProfileData {
  username: string;
  platform: string[] | null;
  avatar_url: string | null;
  bio?: string | null;
}

interface MatchHistoryItem {
  id: string;
  created_at: string;
  status: string;
  winner_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  tournaments?: { name?: string | null } | null;
  games?: { name?: string | null } | null;
}

interface RankingStats {
  wins: number;
  losses: number;
  points: number;
  matches_played: number;
  elo_rating: number;
}

interface StatItemProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

function getRankTitle(elo: number) {
  if (elo >= 2200) return 'Arena Legend';
  if (elo >= 2000) return 'Grand Champion';
  if (elo >= 1800) return 'Elite';
  if (elo >= 1600) return 'Diamond';
  if (elo >= 1400) return 'Gold';
  if (elo >= 1200) return 'Silver';
  return 'Bronze';
}

function getProgressTitle(points: number) {
  if (points >= 500) return 'Veteran';
  if (points >= 250) return 'Pro Competitor';
  if (points >= 100) return 'Rising Star';
  if (points >= 25) return 'Contender';
  return 'New Recruit';
}

function getWinRate(wins: number, losses: number) {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [stats, setStats] = React.useState<RankingStats>({
    wins: 0,
    losses: 0,
    points: 0,
    matches_played: 0,
    elo_rating: 1200,
  });
  const [matches, setMatches] = React.useState<MatchHistoryItem[]>([]);
  const [globalRank, setGlobalRank] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function getProfileData() {
      if (!id) return;

      setLoading(true);
      setErr(null);

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('username, platform, avatar_url, bio')
        .eq('id', id)
        .single();

      if (profileErr || !profileData) {
        setErr('Player profile not found.');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: ranking } = await supabase
        .from('rankings')
        .select('wins, losses, points, matches_played, elo_rating')
        .eq('profile_id', id)
        .maybeSingle();

      if (ranking) {
        setStats({
          wins: ranking.wins || 0,
          losses: ranking.losses || 0,
          points: ranking.points || 0,
          matches_played: ranking.matches_played || 0,
          elo_rating: ranking.elo_rating || 1200,
        });
      }

      const { data: leaderboard } = await supabase
        .from('rankings')
        .select('profile_id')
        .order('points', { ascending: false })
        .order('wins', { ascending: false })
        .order('elo_rating', { ascending: false });

      if (leaderboard) {
        const rankIndex = leaderboard.findIndex((row) => row.profile_id === id);
        setGlobalRank(rankIndex >= 0 ? rankIndex + 1 : null);
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
        .limit(6);

      setMatches((history || []) as MatchHistoryItem[]);
      setLoading(false);
    }

    getProfileData();
  }, [id]);

  const winRate = getWinRate(stats.wins, stats.losses);
  const rankTitle = getRankTitle(stats.elo_rating);
  const progressTitle = getProgressTitle(stats.points);

  const recentForm = matches
    .filter((m) => m.status === 'completed')
    .slice(0, 5)
    .map((m) => (m.winner_id === id ? 'W' : 'L'));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-blue-400 font-black tracking-[0.4em] animate-pulse text-xs uppercase">
          Loading Player Profile...
        </div>
      </div>
    );
  }

  if (err || !profile) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
          <ShieldCheck size={32} />
        </div>

        <h2 className="text-xl font-black uppercase italic text-white tracking-tighter">
          Profile Offline
        </h2>

        <p className="text-gray-400 text-sm mt-2">
          {err || 'The requested player is unavailable.'}
        </p>

        <Button
          onClick={() => nav(-1)}
          className="mt-8 bg-gray-900 border-gray-800 text-xs font-black uppercase tracking-widest"
        >
          Back to Arena
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#03040a] text-gray-100 pb-20 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.14),transparent_30%),linear-gradient(to_bottom,#03040a,#050505)]" />

      <div className="container max-w-6xl mx-auto px-4 pt-10 sm:pt-12 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              Back
            </span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Profile link copied!');
            }}
            className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 hover:text-blue-400 transition-colors"
          >
            <Share2 size={18} />
          </button>
        </div>

        <Card className="bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950/40 border-blue-500/20 p-0 rounded-[2rem] overflow-hidden shadow-2xl mb-8">
          <div className="h-36 bg-gradient-to-r from-blue-900/50 via-cyan-700/20 to-purple-900/30 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_35%)]" />
          </div>

          <div className="px-6 sm:px-8 pb-10">
            <div className="relative -mt-16 flex flex-col items-center lg:flex-row lg:items-end lg:gap-8 mb-8">
              <div className="relative">
                <Avatar
                  src={profile.avatar_url || ''}
                  alt={profile.username}
                  size={145}
                  className="border-8 border-[#0a0a0c] shadow-2xl"
                />

                <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center border-4 border-[#0a0a0c] text-black shadow-lg">
                  <Crown size={20} />
                </div>
              </div>

              <div className="mt-6 text-center lg:text-left flex-1">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white leading-none">
                    {profile.username}
                  </h1>

                  {globalRank && (
                    <span className="mx-auto lg:mx-0 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[10px] font-black uppercase tracking-widest">
                      Global #{globalRank}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-2">
                  <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-300 text-[10px] font-black uppercase tracking-wider">
                    {rankTitle}
                  </span>

                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-[10px] font-black uppercase tracking-wider">
                    {progressTitle}
                  </span>

                  <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-300 text-[10px] font-black uppercase tracking-wider">
                    {stats.elo_rating} ELO
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap justify-center lg:justify-start gap-2">
                  {recentForm.length > 0 ? (
                    recentForm.map((result, index) => (
                      <span
                        key={`${result}-${index}`}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs ${
                          result === 'W'
                            ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                            : 'bg-red-500/15 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {result}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs font-bold uppercase">
                      No recent form yet
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-800 pt-8">
              <StatItem label="XP" value={stats.points.toLocaleString()} icon={<TrendingUp size={14} />} color="text-blue-300" />
              <StatItem label="ELO" value={stats.elo_rating} icon={<Trophy size={14} />} color="text-yellow-300" />
              <StatItem label="Wins" value={stats.wins} icon={<Swords size={14} />} color="text-green-300" />
              <StatItem label="Losses" value={stats.losses} icon={<ShieldCheck size={14} />} color="text-red-300" />
              <StatItem label="Played" value={stats.matches_played} icon={<History size={14} />} color="text-cyan-300" />
              <StatItem label="Win Rate" value={`${winRate}%`} icon={<Flame size={14} />} color="text-purple-300" />
              <StatItem label="Rank" value={rankTitle} icon={<Medal size={14} />} color="text-yellow-300" />
              <StatItem label="Title" value={progressTitle} icon={<Star size={14} />} color="text-blue-300" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-gray-950/80 border border-gray-800 p-6 rounded-3xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">
                About Player
              </h3>

              <p className="text-gray-300 text-sm leading-relaxed font-medium">
                {profile.bio || 'No player bio provided yet.'}
              </p>

              <div className="mt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">
                  Platforms
                </h3>

                <div className="flex flex-wrap gap-2">
                  {profile.platform && profile.platform.length > 0 ? (
                    profile.platform.map((p) => (
                      <span
                        key={p}
                        className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/30 text-blue-300 text-[9px] font-black uppercase rounded-lg"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs font-bold">
                      No platforms selected.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">
                  Opponent Snapshot
                </h3>

                <div className="space-y-3 text-xs font-bold">
                  <div className="flex justify-between text-gray-300">
                    <span>Competitive Tier</span>
                    <span className="text-yellow-300">{rankTitle}</span>
                  </div>

                  <div className="flex justify-between text-gray-300">
                    <span>Progress Title</span>
                    <span className="text-blue-300">{progressTitle}</span>
                  </div>

                  <div className="flex justify-between text-gray-300">
                    <span>Record</span>
                    <span className="text-green-300">
                      {stats.wins}W - {stats.losses}L
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-300">
                    <span>Win Rate</span>
                    <span className="text-purple-300">{winRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4 flex items-center gap-2">
              <History size={14} /> Recent Combat Record
            </h3>

            <div className="space-y-3">
              {matches.length > 0 ? (
                matches.map((m) => {
                  const result =
                    m.status === 'completed'
                      ? m.winner_id === id
                        ? 'Win'
                        : 'Loss'
                      : m.status;

                  return (
                    <div
                      key={m.id}
                      className="bg-gray-950/80 border border-gray-800 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-blue-500/40 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-300">
                          <Swords size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-sm uppercase italic tracking-tight text-white truncate">
                            {m.tournaments?.name || m.games?.name || 'Friendly Match'}
                          </p>

                          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                            {new Date(m.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${
                          result === 'Win'
                            ? 'bg-green-500/10 text-green-300'
                            : result === 'Loss'
                            ? 'bg-red-500/10 text-red-300'
                            : 'bg-blue-500/10 text-blue-300'
                        }`}
                      >
                        {result}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-gray-800 rounded-3xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    No recent matches
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, icon, color = 'text-white' }: StatItemProps) {
  return (
    <div className="flex flex-col gap-1 bg-black/30 border border-white/10 rounded-xl p-3 min-h-[82px] justify-between">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest leading-none">
          {label}
        </span>
      </div>

      <p className={`text-base sm:text-lg font-black italic tracking-tighter break-words ${color}`}>
        {value}
      </p>
    </div>
  );
}