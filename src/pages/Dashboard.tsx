import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { Link } from 'react-router-dom';
import { Card, SectionTitle, Avatar, Button } from '../components/ui';
import { OpenChallenges } from '../components/OpenChallenges';
import { FriendlyHistory } from '../components/FriendlyHistory';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Trophy, Zap, Target, LayoutDashboard, Check, X } from 'lucide-react';
import soccerImg from '../images/Soccer.png';

interface MatchCardProps {
  match: any;
  uid: string | null;
  name: (pid?: string | null) => string;
  avatar: (pid?: string | null) => string | null;
}

interface GameOption {
  id: string;
  name: string;
}

async function fetchUpcoming() {
  const { data, error } = await supabase
    .from('v_user_upcoming_matches')
    .select('*')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function fetchGames() {
  const { data, error } = await supabase
    .from('games')
    .select('id,name')
    .order('name');
  if (error) throw error;
  return data as GameOption[];
}

const EmptyState = () => (
  <div className="col-span-full relative overflow-hidden py-20 flex flex-col items-center text-center bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-sm">
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
  
  // Safe status evaluation across both matches row view parameters
  const isPendingVerification = match.status === 'pending' || match.match_results_status === 'pending';

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
      <Card className="relative bg-[#0a0a0c] border-gray-800 p-0 overflow-hidden rounded-2xl group-hover:border-gray-700 transition-all">
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">
                {match.tournament_name || 'Exhibition Arena'}
              </span>
              <span className="text-[10px] text-gray-400 font-mono mt-1 font-bold uppercase">{new Date(match.scheduled_at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-gray-950 border border-gray-800">
              <span className={`text-[9px] font-black uppercase tracking-wider ${isPendingVerification ? 'text-amber-400 animate-pulse' : 'text-green-400'}`}>
                ● {isPendingVerification ? 'Pending Approval' : match.status}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-4 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>

            <div className="flex flex-col items-center gap-3 z-10 flex-1">
              <Avatar src={avatar(match.player1_id) || ''} alt={name(match.player1_id)} className="w-16 h-16 border-2 border-gray-800" />
              <span className="text-sm font-black text-gray-100 bg-gray-950/80 px-2 py-0.5 rounded-md border border-white/5 truncate w-full text-center uppercase tracking-wide">
                {name(match.player1_id)}
              </span>
            </div>

            <div className="z-10 bg-[#0a0a0c] px-3 py-1 border border-gray-800 rounded-md">
              {match.score_player1 !== null && match.score_player1 !== undefined && match.score_player2 !== null && match.score_player2 !== undefined ? (
                <span className="font-mono font-black text-blue-400 text-sm">{match.score_player1} : {match.score_player2}</span>
              ) : (
                <span className="text-gray-500 font-black italic text-xl">VS</span>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 z-10 flex-1">
              <Avatar src={avatar(match.player2_id) || ''} alt={name(match.player2_id)} className="w-16 h-16 border-2 border-gray-800" />
              <span className="text-sm font-black text-gray-100 bg-gray-950/80 px-2 py-0.5 rounded-md border border-white/5 truncate w-full text-center uppercase tracking-wide">
                {name(match.player2_id)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex gap-3 pt-5 border-t border-gray-900">
            <Link to={`/matches/${match.match_id}`} className="flex-1">
              <Button variant="outline" className="w-full text-[10px] font-black border-gray-800 hover:bg-gray-900 text-gray-300 py-2 uppercase tracking-widest">
                Combat Hub
              </Button>
            </Link>
            {involved && !isPendingVerification && match.status !== 'completed' && (
              <Link to={`/tournaments/${match.tournament_id || 'exhibition'}/submit/${match.match_id}`} className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-2 uppercase tracking-widest shadow-lg">
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
  const [selectedGame, setSelectedGame] = React.useState<string>('');
  const [incomingChallenges, setIncomingChallenges] = React.useState<any[]>([]);
  const [quickLoading, setQuickLoading] = React.useState(false);
  
  const nav = useNavigate();
  const notify = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['upcoming'], queryFn: fetchUpcoming });
  const { data: games, isLoading: gamesLoading } = useQuery({ queryKey: ['games'], queryFn: fetchGames });

  const fetchIncomingDirectChallenges = async (myId: string) => {
    const { data: directMatches } = await supabase
      .from('matches')
      .select('id, player1_id, game_id, games(name)')
      .eq('player2_id', myId)
      .eq('status', 'pending');
    setIncomingChallenges(directMatches || []);
  };

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: authData }) => {
      const myId = authData.user?.id ?? null;
      setUid(myId);
      if (myId) {
        fetchIncomingDirectChallenges(myId);
      }
    });
  }, []);

  const acceptDirectChallenge = async (matchId: string) => {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'ongoing' })
      .eq('id', matchId);

    if (!error) {
      notify('Challenge accepted! Preparing combat parameters...', 'success');
      queryClient.invalidateQueries({ queryKey: ['upcoming'] });
      if (uid) fetchIncomingDirectChallenges(uid);
      nav(`/matches/${matchId}`);
    } else {
      notify('Failed to respond to challenge.', 'error');
    }
  };

  const declineDirectChallenge = async (matchId: string) => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (!error) {
      notify('Challenge declined and terminated.', 'info');
      if (uid) fetchIncomingDirectChallenges(uid);
    }
  };

  const ids = [...(data || []).flatMap((m: any) => [m.player1_id, m.player2_id]), ...incomingChallenges.map(c => c.player1_id)].filter(Boolean) as string[];
  const { nameMap, avatarMap } = useProfilesMap(ids);

  const name = (pid?: string | null) => (pid ? (nameMap.get(pid) || 'Player') : 'TBD');
  const avatar = (pid?: string | null) => (pid ? (avatarMap.get(pid) || null) : null);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20">
      <div className="container mx-auto px-4 pt-16 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-[0.3em]">
              <LayoutDashboard size={14} /> Command Center
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
              Upcoming <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Fixtures</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link to="/matches/new">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all">
                Challenge Player
              </Button>
            </Link>
            
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <select
                className="input bg-gradient-to-r from-blue-900/30 to-blue-800/20 border-2 border-blue-600 text-white font-semibold rounded-xl p-2"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                disabled={gamesLoading}
              >
                <option value="" className="bg-gray-900 text-white">Quick Match Picker</option>
                {games?.map((game) => (
                  <option key={game.id} value={game.id} className="bg-gray-900 text-white">{game.name}</option>
                ))}
              </select>
              <Button
                onClick={async () => {
                  try {
                    if (!selectedGame) {
                      notify('Please select a game for Quick Match.', 'error');
                      return;
                    }
                    setQuickLoading(true);
                    const { data: rpcRes, error } = await supabase.rpc('claim_quick_match', {
                      p_uid: uid,
                      p_game_id: selectedGame
                    });
                    if (!error && rpcRes) {
                      notify('Match Found! Syncing instances...', 'success');
                      nav(`/matches/${rpcRes}`);
                    } else {
                      notify('No open matches. Initiated queue broadcast.', 'info');
                    }
                  } finally { setQuickLoading(false); }
                }}
                disabled={quickLoading || gamesLoading}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest"
              >
                {quickLoading ? 'Searching...' : 'Quick Match'}
              </Button>
            </div>
          </div>
        </header>

        {incomingChallenges.length > 0 && (
          <div className="mb-10 bg-amber-600/10 border-2 border-amber-500/40 p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-amber-400 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
              ⚠️ Priority Infiltration Intercepted: Incoming Challenges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomingChallenges.map((ch) => (
                <div key={ch.id} className="bg-black/60 border border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">From: <span className="text-white font-black">{name(ch.player1_id)}</span></p>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-wide mt-1">{ch.games?.name || 'Exhibition Match'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptDirectChallenge(ch.id)} className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-transform active:scale-95"><Check size={16}/></button>
                    <button onClick={() => declineDirectChallenge(ch.id)} className="p-2 bg-red-600 hover:bg-red-400 text-white rounded-lg transition-transform active:scale-95"><X size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {isLoading
            ? [1, 2, 3].map((n) => <div key={n} className="h-64 bg-gray-900/50 rounded-2xl animate-pulse border border-gray-800"></div>)
            : data && data.length > 0
              ? data.map((m: any) => <MatchCard key={m.match_id} match={m} uid={uid} name={name} avatar={avatar} />)
              : <EmptyState />
          }
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><OpenChallenges /></div>
          <div className="lg:col-span-2"><FriendlyHistory uid={uid} /></div>
        </div>
      </div>
    </div>
  );
}