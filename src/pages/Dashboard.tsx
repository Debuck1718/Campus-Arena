import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { Link } from 'react-router-dom';
import { Card, SectionTitle, Avatar, Button } from '../components/ui';
import { Trophy, Zap, Target, LayoutDashboard } from 'lucide-react';
import soccerImg from '../images/Soccer.png';

interface MatchCardProps {
  match: any;
  uid: string | null;
  name: (pid?: string | null) => string;
  avatar: (pid?: string | null) => string | null;
}

async function fetchUpcoming() {
  const { data, error } = await supabase
    .from('v_user_upcoming_matches')
    .select('*')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data;
}

const EmptyState = () => (
  <div className="col-span-full relative overflow-hidden py-20 flex flex-col items-center text-center bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-sm">
    {/* Decorative background image for empty state */}
    <img 
      src={soccerImg} 
      alt="" 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 opacity-5 grayscale pointer-events-none" 
    />
    <div className="relative z-10">
      <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
        <Target size={48} className="text-blue-500" />
      </div>
      <h3 className="text-2xl font-black uppercase italic text-white mb-3">No Arena Activity</h3>
      <p className="text-gray-400 max-w-sm mb-8 px-6">Your schedule is currently clear. Head over to the tournament center to claim your next spot on the field.</p>
      <Link to="/tournaments">
        <Button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-6 rounded-xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
          Find a Match
        </Button>
      </Link>
    </div>
  </div>
);

const MatchCard: React.FC<MatchCardProps> = ({ match, uid, name, avatar }) => {
  const involved = uid && (uid === match.player1_id || uid === match.player2_id);

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
      <Card className="relative bg-[#0a0a0c] border-gray-800 p-0 overflow-hidden rounded-2xl group-hover:border-gray-700 transition-all">
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">
                {match.tournament_name || 'Exhibition'}
              </span>
              <span className="text-[10px] text-gray-500 font-bold uppercase">{new Date(match.scheduled_at).toLocaleString([], {weekday: 'short', hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800">
              <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter">● {match.status}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-4 relative">
            {/* Visual connector */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
            
            <div className="flex flex-col items-center gap-3 z-10 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <Avatar src={avatar(match.player1_id) || ''} alt={name(match.player1_id)} className="w-16 h-16 border-2 border-gray-800" />
              </div>
              <span className="text-xs font-black text-white truncate w-full text-center uppercase tracking-tight">{name(match.player1_id)}</span>
            </div>

            <div className="z-10 bg-[#0a0a0c] px-3">
              <span className="text-gray-700 font-black italic text-2xl">VS</span>
            </div>

            <div className="flex flex-col items-center gap-3 z-10 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <Avatar src={avatar(match.player2_id) || ''} alt={name(match.player2_id)} className="w-16 h-16 border-2 border-gray-800" />
              </div>
              <span className="text-xs font-black text-white truncate w-full text-center uppercase tracking-tight">{name(match.player2_id)}</span>
            </div>
          </div>

          <div className="mt-8 flex gap-3 pt-5 border-t border-gray-900">
            <Link to={`/tournaments/${match.tournament_id}/match/${match.match_id}`} className="flex-1">
              <Button variant="outline" className="w-full text-[10px] font-black border-gray-800 hover:bg-gray-900 text-gray-400 py-2 uppercase tracking-widest">
                Analytics
              </Button>
            </Link>
            {involved && match.status !== 'completed' && (
              <Link to={`/tournaments/${match.tournament_id}/submit/${match.match_id}`} className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-2 uppercase tracking-widest shadow-lg shadow-blue-900/20">
                  Report
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export function Dashboard() {
  const [uid, setUid] = React.useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['upcoming'], queryFn: fetchUpcoming });

  React.useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); 
  }, []);

  const ids = (data || []).flatMap((m: any) => [m.player1_id, m.player2_id]).filter(Boolean) as string[];
  const { nameMap, avatarMap } = useProfilesMap(ids);
  
  const name = (pid?: string | null) => (pid ? (nameMap.get(pid) || 'Player') : 'TBD');
  const avatar = (pid?: string | null) => (pid ? (avatarMap.get(pid) || null) : null);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20">
      {/* Decorative Header Background */}
      <div className="absolute top-0 left-0 w-full h-64 overflow-hidden pointer-events-none opacity-20">
        <img 
          src={soccerImg} 
          alt="" 
          className="absolute -top-12 -right-12 w-96 blur-3xl" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]"></div>
      </div>

      <div className="container mx-auto px-4 pt-16 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-[0.3em]">
              <LayoutDashboard size={14} />
              Command Center
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
              Upcoming <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Fixtures</span>
            </h1>
            <p className="text-gray-500 font-medium text-sm border-l-2 border-blue-600 pl-4 max-w-md">
              Your personalized match schedule. Prepare for your upcoming challenges and report results.
            </p>
          </div>
          
          {data && data.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-md p-4 rounded-2xl border border-gray-800 flex gap-6 items-center">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Next Battle</p>
                <p className="text-lg font-bold text-white uppercase italic tracking-tight">{name(data[0].player1_id === uid ? data[0].player2_id : data[0].player1_id)}</p>
              </div>
              <Trophy className="text-yellow-500 opacity-50" size={32} />
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {isLoading 
            ? [1, 2, 3].map((n) => (
                <div key={n} className="h-64 bg-gray-900/50 rounded-2xl animate-pulse border border-gray-800"></div>
              ))
            : data && data.length > 0 
              ? data.map((m: any) => (
                  <MatchCard key={m.match_id} match={m} uid={uid} name={name} avatar={avatar} />
                ))
              : <EmptyState />
          }
        </div>
      </div>
    </div>
  );
}