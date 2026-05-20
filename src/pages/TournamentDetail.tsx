import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useMatchResults } from '../hooks/useMatchResults';
import { awardBadge } from '../lib/achievements'; // Your achievement helper
import championImg from '../images/champion.png';
import cupImg from '../images/cup1.png';
import winnerImg from '../images/winner.png';
import {
  Trophy,
  Gamepad2,
  Users,
  Zap,
  ArrowLeft,
  History,
  ShieldCheck
} from 'lucide-react';
import { Chat } from '../components/Chat';
import { useTournamentChatId } from '../hooks/useTournamentChatId';

async function fetchTournament(id: string) {
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).single();
  if (error) throw error;

  const { data: players } = await supabase
    .from('tournament_players')
    .select('profile_id')
    .eq('tournament_id', id);

  const { data: matches } = await supabase
    .from('matches')
    .select('id, round_number, match_number, player1_id, player2_id, winner_id, status')
    .eq('tournament_id', id)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });

  return { t: data, players: players || [], matches: matches || [] };
}

export function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [err, setErr] = React.useState<string | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id!),
    enabled: !!id
  });

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // --- ACHIEVEMENT LOGIC ---
  // If tournament is completed and there's a winner, award the badge
  React.useEffect(() => {
    if (data?.t?.status === 'completed' && data?.t?.winner_id) {
      awardBadge(data.t.winner_id, 'tournament_champion');
    }
  }, [data?.t?.status, data?.t?.winner_id]);

  const players = data?.players ?? [];
  const matchData = data?.matches ?? [];
  const t = data?.t;
  const idList = [
    ...players.map((p: { profile_id: string }) => p.profile_id),
    ...matchData
      .flatMap((m: { player1_id?: string; player2_id?: string; winner_id?: string }) => [m.player1_id, m.player2_id, m.winner_id])
      .filter((pid): pid is string => Boolean(pid))
  ];
  const { nameMap, avatarMap } = useProfilesMap(idList);
  const chatId = useTournamentChatId(id);
  const name = (pid?: string | null) => (pid ? nameMap.get(pid) || pid : 'TBD');
  const avatar = (pid?: string | null) => (pid ? avatarMap.get(pid) || null : null);

  async function handleAction(rpcName: string) {
    try {
      setErr(null);
      const params: any = {};
      if (rpcName.startsWith('tournament_')) {
        params.p_id = id;
      } else {
        params.p_tournament = id;
      }

      const { error } = await supabase.rpc(rpcName, params);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['tournament', id] });
    } catch (e: any) {
      setErr(e.message || `Action failed: ${rpcName}`);
    }
  }

  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-widest">Entering Arena...</div>;
  if (error || !data) return <div className="container py-10 text-red-500">Error: {(error as any)?.message}</div>;

  // Grouping matches into rounds
  const rounds: Record<number, typeof matchData> = {};
  matchData.forEach((m) => {
    rounds[m.round_number] = rounds[m.round_number] || [];
    rounds[m.round_number].push(m);
  });
  const sortedRoundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-blue-900/20 to-transparent border-b border-white/5 pt-12 pb-10">
        <div className="container mx-auto px-4">
          <Link to="/tournaments" className="flex items-center gap-2 text-gray-500 hover:text-white mb-6 text-[10px] font-black uppercase tracking-widest transition-colors">
            <ArrowLeft size={14} /> Back to Circuit
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-blue-600 text-[9px] font-black uppercase rounded italic tracking-wider">Live Bracket</span>
                <span className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em]">{t.platform} • {t.format}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white">{t.name}</h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => handleAction('join_tournament')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center gap-2">
                <Zap size={14} /> Join Arena
              </button>
              <button onClick={() => handleAction('tournament_start_single_elim')} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                Start Bracket
              </button>
            </div>
          </div>
          {err && <div className="mt-4 text-red-500 text-xs font-bold uppercase tracking-tighter italic">! Error: {err}</div>}
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

          {/* BRACKET AREA */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-3 mb-8">
              <img src={championImg} alt="Bracket" className="h-6" />
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-500">Combat Grid</h3>
            </div>

            {sortedRoundNumbers.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-gray-900 rounded-[2rem] opacity-30">
                <p className="text-xs font-black uppercase tracking-[0.4em]">Awaiting Combatants</p>
              </div>
            ) : (
              <div className="flex gap-8 overflow-x-auto pb-10 snap-x">
                {sortedRoundNumbers.map((round) => (
                  <div key={round} className="flex flex-col gap-6 min-w-[280px] snap-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 border-b border-white/5 pb-2">
                      Round {round}
                    </div>
                    {rounds[round].map((m) => (
                      <MatchCard
                        key={m.id}
                        m={m}
                        uid={uid}
                        name={name}
                        avatar={avatar}
                        tournamentId={id!}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* WINNER SPOTLIGHT */}
            {t.winner_id && (
              <div className="mt-20 flex flex-col items-center bg-gradient-to-t from-blue-900/10 to-transparent p-12 rounded-[3rem] border border-blue-500/10 shadow-2xl">
                <img src={winnerImg} alt="Winner" className="h-32 mb-6 animate-bounce" />
                <h2 className="text-xs font-black uppercase tracking-[0.5em] text-blue-500 mb-2">Grand Champion</h2>
                <div className="text-4xl font-black uppercase italic tracking-tighter text-white">{name(t.winner_id)}</div>
                <div className="mt-6 px-4 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 text-[9px] font-black uppercase tracking-widest">
                  Badge Awarded: Tournament Champion
                </div>
              </div>
            )}
          </div>
          {/* Tournament Chat */}
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-3">
              <Gamepad2 size={18} className="text-blue-500" />
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-500">Tournament Chat</h3>
            </div>
            <Chat chatId={chatId} />
          </div>

          {/* SIDEBAR: PLAYERS */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a0c] border border-white/5 p-6 rounded-[2rem] sticky top-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 flex items-center gap-2">
                <Users size={14} /> Registered Operatives
              </h3>
              <div className="space-y-4">
                {players.map((p: any) => (
                  <div key={p.profile_id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black group-hover:border-blue-500 transition-colors">
                        {name(p.profile_id).charAt(0)}
                      </div>
                      <span className="text-sm font-bold uppercase italic tracking-tight text-gray-300 group-hover:text-white">
                        {name(p.profile_id)}
                      </span>
                    </div>
                    {t.winner_id === p.profile_id && <Trophy size={14} className="text-yellow-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Sub-component for individual Match Cards
function MatchCard({ m, uid, name, avatar, tournamentId }: any) {
  const involved = uid && (uid === m.player1_id || uid === m.player2_id);
  const isP1Winner = m.winner_id === m.player1_id;
  const isP2Winner = m.winner_id === m.player2_id;

  const { data: results } = useMatchResults(m.id);

  return (
    <div className={`bg-[#0a0a0c] border ${involved ? 'border-blue-600 shadow-lg shadow-blue-600/10' : 'border-white/5'} p-5 rounded-2xl transition-all hover:bg-white/[0.02]`}>
      <div className="flex justify-between items-center mb-4 text-[9px] font-black uppercase tracking-widest">
        <span className="text-gray-600">Match {m.match_number}</span>
        <span className={m.status === 'completed' ? 'text-green-500' : 'text-blue-500'}>{m.status}</span>
      </div>

      <div className="space-y-4 mb-4">
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isP1Winner ? 'bg-blue-600/20 border border-blue-500/40' : 'bg-white/5 border border-white/10'
          }`}>
          {avatar(m.player1_id) && (
            <img
              src={avatar(m.player1_id)}
              alt={name(m.player1_id)}
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/40 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
            <span className="text-base font-bold uppercase italic tracking-tight text-blue-300 bg-black/30 px-2 py-1 rounded truncate">{name(m.player1_id)}</span>
            {isP1Winner && <ShieldCheck size={16} className="text-blue-500 flex-shrink-0" />}
          </div>
        </div>
        <div className="h-[1px] bg-white/5" />
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isP2Winner ? 'bg-blue-600/20 border border-blue-500/40' : 'bg-white/5 border border-white/10'
          }`}>
          {avatar(m.player2_id) && (
            <img
              src={avatar(m.player2_id)}
              alt={name(m.player2_id)}
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/40 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
            <span className="text-base font-bold uppercase italic tracking-tight text-blue-300 bg-black/30 px-2 py-1 rounded truncate">{name(m.player2_id)}</span>
            {isP2Winner && <ShieldCheck size={16} className="text-blue-500 flex-shrink-0" />}
          </div>
        </div>
      </div>

      {results && results.length > 0 && (
        <div className="pt-3 border-t border-white/5 flex gap-2 overflow-x-auto">
          {results.map((r: any) => r.screenshot_url && (
            <img key={r.id} src={r.screenshot_url} alt="Proof" className="h-10 w-10 object-cover rounded-lg border border-white/10" />
          ))}
        </div>
      )}

      {involved && m.status !== 'completed' && (
        <Link
          to={`/tournaments/${tournamentId}/submit/${m.id}`}
          className="mt-4 block text-center py-2 bg-white/5 hover:bg-blue-600 transition-colors rounded-xl text-[9px] font-black uppercase tracking-widest"
        >
          Submit Result
        </Link>
      )}
    </div>
  );
}