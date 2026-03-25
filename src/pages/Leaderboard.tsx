import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Card, Avatar } from '../components/ui';
import { Trophy, Medal, Flame, Award, TrendingUp, User } from 'lucide-react';

// --- Database Logic: Updated to use profile_id ---
async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('rankings')
    .select(`
      wins, 
      losses, 
      points,
      profile_id,
      profiles:profile_id (
        username,
        avatar_url
      )
    `)
    .order('points', { ascending: false })
    .limit(50);
    
  if (error) throw error;
  return data;
}

export function Leaderboard() {
  const { data: rankingData, isLoading, error } = useQuery({
    queryKey: ['globalLeaderboard'],
    queryFn: fetchLeaderboard
  });

  if (isLoading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
      <span className="text-blue-500 font-black tracking-[0.5em] text-xs animate-pulse uppercase">Retrieving Legend Data</span>
    </div>
  );

  if (error) return <div className="text-red-500 text-center py-20 font-black">SYSTEM ERROR: UNABLE TO REACH ARENA DATA</div>;

  const topThree = rankingData?.slice(0, 3) || [];
  const theRest = rankingData?.slice(3) || [];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/5 blur-[160px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 pt-16 relative z-10">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
            <Flame size={14} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Global Circuit Rankings</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter text-white mb-4 leading-none">
            Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Legends</span>
          </h1>
        </header>

        {/* --- THE PODIUM (Top 3) --- */}
        <div className="flex flex-col md:flex-row items-end justify-center gap-8 mb-24 px-4">
          {topThree[1] && <PodiumPosition rankData={topThree[1]} rank={2} height="h-44" color="text-slate-400" glow="shadow-slate-500/10" />}
          {topThree[0] && <PodiumPosition rankData={topThree[0]} rank={1} height="h-64" color="text-yellow-500" glow="shadow-yellow-500/20" featured />}
          {topThree[2] && <PodiumPosition rankData={topThree[2]} rank={3} height="h-32" color="text-amber-700" glow="shadow-amber-900/10" />}
        </div>

        {/* --- THE RANKING LIST --- */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-12 px-8 py-4 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 border-b border-gray-900">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5 md:col-span-6">Contender</div>
            <div className="col-span-2 text-center">W / L</div>
            <div className="col-span-2 md:col-span-1 text-center">Win %</div>
            <div className="col-span-2 text-right">Points</div>
          </div>

          <div className="space-y-3">
            {theRest.map((item: any, index: number) => {
              const profile = item.profiles;
              const winRate = item.wins + item.losses > 0 
                ? Math.round((item.wins / (item.wins + item.losses)) * 100) 
                : 0;

              return (
                <div 
                  key={item.profile_id} // Updated key
                  className="group grid grid-cols-12 items-center px-8 py-5 bg-[#0a0a0c]/50 border border-gray-800/40 rounded-2xl hover:border-blue-500/40 hover:bg-blue-600/[0.03] transition-all duration-300"
                >
                  <div className="col-span-1 font-black text-gray-800 group-hover:text-blue-500 italic text-xl">
                    {index + 4}
                  </div>
                  
                  <div className="col-span-5 md:col-span-6 flex items-center gap-4">
                    <Avatar 
                      src={profile?.avatar_url} 
                      alt={profile?.username || 'Player'} 
                      size={44} 
                      className="border-2 border-gray-900 group-hover:border-blue-500/50 transition-all" 
                    />
                    <div className="flex flex-col">
                      <span className="font-black text-white uppercase tracking-tight text-sm">
                        {profile?.username || 'Unknown Operator'}
                      </span>
                      <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Verified Competitor</span>
                    </div>
                  </div>

                  <div className="col-span-2 text-center font-mono text-xs text-gray-500">
                    <span className="text-green-500/80">{item.wins}</span> 
                    <span className="mx-1 text-gray-800">/</span> 
                    <span className="text-red-500/80">{item.losses}</span>
                  </div>

                  <div className="col-span-2 md:col-span-1 text-center font-black text-[10px] text-gray-400">
                    {winRate}%
                  </div>

                  <div className="col-span-2 text-right font-black text-blue-500 text-lg italic tracking-tighter">
                    {item.points?.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Podium Sub-Component (Updated key usage) ---
function PodiumPosition({ rankData, rank, height, color, glow, featured = false }: any) {
  const profile = rankData.profiles;
  return (
    <div className={`flex flex-col items-center gap-6 ${featured ? 'order-1 md:order-2' : rank === 2 ? 'order-2 md:order-1' : 'order-3'}`}>
      <div className="relative group">
        <div className={`absolute -inset-2 bg-gradient-to-t from-blue-600/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        <div className="relative">
           <Avatar 
            src={profile?.avatar_url} 
            alt={profile?.username || 'Legend'} 
            size={featured ? 120 : 90} 
            className={`border-4 ${featured ? 'border-yellow-500 shadow-2xl ' + glow : 'border-gray-800 shadow-xl ' + glow}`} 
          />
          <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-[#0a0a0c] border border-gray-800 flex items-center justify-center font-black shadow-2xl ${color}`}>
            {rank === 1 ? <Trophy size={18} /> : rank === 2 ? <Award size={18} /> : <TrendingUp size={18} />}
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-1">
        <h3 className="font-black uppercase italic text-white tracking-tighter text-lg leading-none">
          {profile?.username || 'TBD'}
        </h3>
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${color}`}>
          {rankData.points?.toLocaleString()} <span className="opacity-50 text-[8px]">XP</span>
        </p>
      </div>

      <div className={`w-32 md:w-40 ${height} bg-gradient-to-b from-gray-900 to-black border-t-2 border-gray-800/50 rounded-t-3xl flex flex-col items-center pt-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden`}>
        <span className="text-6xl font-black italic opacity-5 select-none pointer-events-none">{rank}</span>
        {featured && <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />}
      </div>
    </div>
  );
}