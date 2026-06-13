import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Avatar } from '../components/ui';
import { Trophy, Flame, Award, TrendingUp, Medal, Swords } from 'lucide-react';

interface LeaderboardProfile {
  username?: string | null;
  avatar_url?: string | null;
}

interface LeaderboardRow {
  wins: number;
  losses: number;
  points: number;
  matches_played: number;
  elo_rating: number;
  profile_id: string;
  profiles?: LeaderboardProfile | LeaderboardProfile[] | null;
}

function getProfile(row: LeaderboardRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('rankings')
    .select(`
      profile_id,
      points,
      wins,
      losses,
      matches_played,
      elo_rating,
      profiles!rankings_profile_id_fkey (
        username,
        avatar_url
      )
    `)
    .order('points', { ascending: false })
    .order('wins', { ascending: false })
    .order('elo_rating', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as LeaderboardRow[];
}

export function Leaderboard() {
  const { data: rankingData = [], isLoading, error } = useQuery({
    queryKey: ['globalLeaderboard'],
    queryFn: fetchLeaderboard,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <span className="text-blue-400 font-black tracking-[0.4em] text-xs animate-pulse uppercase">
          Loading Rankings
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-red-400 text-center py-20 font-black uppercase">
        System Error: Unable to load leaderboard
      </div>
    );
  }

  const topThree = rankingData.slice(0, 3);
  const rest = rankingData.slice(3);

  return (
    <div className="min-h-screen bg-[#03040a] text-gray-100 pb-24 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_35%),linear-gradient(to_bottom,#03040a,#050505)]" />

      <div className="container mx-auto px-4 pt-14 relative z-10">
        <header className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <Flame size={14} className="text-cyan-300 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-200">
              Global Circuit Rankings
            </span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white leading-none">
            Hall of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Legends
            </span>
          </h1>
        </header>

        {rankingData.length === 0 ? (
          <div className="max-w-3xl mx-auto text-center border border-blue-500/20 bg-gray-950/70 rounded-3xl p-12">
            <Medal size={48} className="mx-auto text-blue-400 mb-4" />
            <h2 className="text-white font-black uppercase text-2xl italic">
              No ranked players yet
            </h2>
            <p className="text-gray-300 mt-2">
              Confirmed matches will appear here once rankings are awarded.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row items-end justify-center gap-8 mb-20">
              {topThree[1] && <PodiumPosition rankData={topThree[1]} rank={2} height="h-40" color="text-slate-300" />}
              {topThree[0] && <PodiumPosition rankData={topThree[0]} rank={1} height="h-60" color="text-yellow-300" featured />}
              {topThree[2] && <PodiumPosition rankData={topThree[2]} rank={3} height="h-32" color="text-amber-500" />}
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="hidden md:grid grid-cols-12 px-6 py-4 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-800">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Contender</div>
                <div className="col-span-2 text-center">W / L</div>
                <div className="col-span-2 text-center">Win %</div>
                <div className="col-span-2 text-right">Points</div>
              </div>

              <div className="space-y-3">
                {rest.map((item, index) => (
                  <RankRow key={item.profile_id} item={item} rank={index + 4} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RankRow({ item, rank }: { item: LeaderboardRow; rank: number }) {
  const profile = getProfile(item);
  const total = (item.wins || 0) + (item.losses || 0);
  const winRate = total > 0 ? Math.round((item.wins / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 md:items-center gap-4 px-5 md:px-6 py-5 bg-gray-950/80 border border-gray-800 rounded-2xl hover:border-blue-500/40 hover:bg-blue-950/20 transition-all">
      <div className="md:col-span-1 font-black text-blue-300 italic text-xl">
        #{rank}
      </div>

      <div className="md:col-span-5 flex items-center gap-4 min-w-0">
        <Avatar
          src={profile?.avatar_url || ''}
          alt={profile?.username || 'Player'}
          size={44}
          className="border-2 border-blue-500/30"
        />
        <div className="min-w-0">
          <p className="font-black text-white uppercase text-sm truncate">
            {profile?.username || 'Unknown Operator'}
          </p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Verified Competitor
          </p>
        </div>
      </div>

      <div className="md:col-span-2 text-sm font-mono font-black text-center">
        <span className="text-green-300">{item.wins || 0}</span>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-red-300">{item.losses || 0}</span>
      </div>

      <div className="md:col-span-2 text-center font-black text-cyan-300 text-sm">
        {winRate}%
      </div>

      <div className="md:col-span-2 text-left md:text-right font-black text-blue-400 text-xl italic">
        {(item.points || 0).toLocaleString()} XP
      </div>
    </div>
  );
}

function PodiumPosition({
  rankData,
  rank,
  height,
  color,
  featured = false,
}: {
  rankData: LeaderboardRow;
  rank: number;
  height: string;
  color: string;
  featured?: boolean;
}) {
  const profile = getProfile(rankData);

  return (
    <div className={`flex flex-col items-center gap-5 ${featured ? 'order-1 md:order-2' : rank === 2 ? 'order-2 md:order-1' : 'order-3'}`}>
      <div className="relative">
        <Avatar
          src={profile?.avatar_url || ''}
          alt={profile?.username || 'Legend'}
          size={featured ? 120 : 90}
          className={`border-4 ${featured ? 'border-yellow-400 shadow-yellow-400/20' : 'border-blue-500/30'} shadow-2xl`}
        />

        <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-black border border-gray-700 flex items-center justify-center ${color}`}>
          {rank === 1 ? <Trophy size={18} /> : rank === 2 ? <Award size={18} /> : <TrendingUp size={18} />}
        </div>
      </div>

      <div className="text-center">
        <h3 className="font-black uppercase italic text-white text-lg">
          {profile?.username || 'TBD'}
        </h3>
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${color}`}>
          {(rankData.points || 0).toLocaleString()} XP
        </p>
      </div>

      <div className={`w-32 md:w-40 ${height} bg-gradient-to-b from-gray-900 to-black border-t-2 border-blue-500/30 rounded-t-3xl flex items-center justify-center`}>
        <span className="text-6xl font-black italic text-white/10">{rank}</span>
      </div>
    </div>
  );
}