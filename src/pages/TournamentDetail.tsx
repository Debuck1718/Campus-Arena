import React from 'react';
import championImg from '../images/champion.png';
import cupImg from '../images/cup1.png';
import winnerImg from '../images/winner.png';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useMatchResults } from '../hooks/useMatchResults';

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
  const { data, isLoading, error } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id!),
    enabled: !!id
  });
  const [err, setErr] = React.useState<string | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // actions via API helper + toasts
  async function join() {
    try {
      setErr(null);
      const { error } = await supabase.rpc('join_tournament', { p_tournament: id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['tournament', id] });
    } catch (e: any) {
      setErr(e.message || 'Failed to join');
    }
  }
  async function leave() {
    try {
      setErr(null);
      const { error } = await supabase.rpc('leave_tournament', { p_tournament: id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['tournament', id] });
    } catch (e: any) {
      setErr(e.message || 'Failed to leave');
    }
  }
  async function start() {
    try {
      setErr(null);
      const { error } = await supabase.rpc('tournament_start_single_elim', { p_id: id });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['tournament', id] });
    } catch (e: any) {
      setErr(e.message || 'Failed to start bracket');
    }
  }
  if (isLoading) return <div className="container py-6">Loading...</div>;
  if (error) return <div className="container py-6 text-red-600">{(error as any).message}</div>;
  if (!data) return null;

  const t = data.t;
  const players = data.players;
  const matches = data.matches as any[];

  const idList = [
    ...players.map((p: any) => p.profile_id),
    ...matches.flatMap((m: any) => [m.player1_id, m.player2_id, m.winner_id]).filter(Boolean)
  ];
  const { nameMap } = useProfilesMap(idList);
  const name = (pid?: string | null) => (pid ? nameMap.get(pid) || pid : 'TBD');

  const rounds: Record<number, any[]> = {};
  matches.forEach((m) => {
    rounds[m.round_number] = rounds[m.round_number] || [];
    rounds[m.round_number].push(m);
  });

  const sortedRoundNumbers = Object.keys(rounds)
    .map((n) => parseInt(n, 10))
    .sort((a, b) => a - b);

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#16a34a';
      case 'scheduled':
        return '#ca8a04';
      case 'pending':
        return '#6b7280';
      case 'disputed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="container py-4">
      <h2 className="text-xl font-semibold mb-1">{t.name}</h2>
      <div className="text-sm text-gray-600 mb-3">
        {t.platform} • {t.format} • {t.status}
      </div>
      <div className="flex gap-2 mb-4">
        <button className="btn btn-primary" onClick={join}>
          Join
        </button>
        <button className="btn btn-outline" onClick={leave}>
          Leave
        </button>
        <button className="btn btn-primary" onClick={start}>
          Start (single elim)
        </button>
      </div>
      {err && <div className="text-red-600 mb-3 text-sm">{err}</div>}

      <div className="flex items-center gap-3 mb-2">
        <img src={championImg} alt="Champion" style={{ height: 32 }} />
        <h3 className="text-lg font-semibold">Bracket</h3>
      </div>
      {sortedRoundNumbers.length === 0 && <div className="text-gray-500">No matches yet.</div>}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
        {sortedRoundNumbers.map((round) => {
          const ms = rounds[round] || [];
          return (
            <div key={round} style={{ minWidth: 260 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Round {round}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ms.map((m: any) => {
                  const involved = uid && (uid === m.player1_id || uid === m.player2_id);
                  const p1 = name(m.player1_id);
                  const p2 = name(m.player2_id);
                  const winner = m.winner_id ? name(m.winner_id) : null;
                  const isP1Winner = !!m.winner_id && m.winner_id === m.player1_id;
                  const isP2Winner = !!m.winner_id && m.winner_id === m.player2_id;

                  // Fetch match results for this match
                  const { data: results, isLoading: loadingResults } = useMatchResults(m.id);

                  return (
                    <div
                      key={m.id}
                      className="card"
                      style={{
                        border: involved ? '2px solid #4f46e5' : undefined,
                        boxShadow: involved ? '0 0 0 2px rgba(79,70,229,0.1)' : undefined,
                        padding: 12
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Match {m.match_number}</div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#ffffff',
                            background: statusColor(m.status),
                            padding: '2px 8px',
                            borderRadius: 999
                          }}
                        >
                          {m.status}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: isP1Winner ? 600 : 400 }}>P1: {p1}{isP1Winner ? ' ✅' : ''}</div>
                        <div style={{ fontWeight: isP2Winner ? 600 : 400 }}>P2: {p2}{isP2Winner ? ' ✅' : ''}</div>
                      </div>
                      {winner && (
                        <div style={{ marginTop: 6, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={cupImg} alt="Winner" style={{ height: 24 }} />
                          Winner: <span style={{ fontWeight: 600 }}>{winner}</span>
                        </div>
                      )}
                      {/* Submitted Results with Screenshots/Videos */}
                      <div className="mt-2">
                        <div className="font-semibold text-xs mb-1">Submitted Results</div>
                        {loadingResults ? (
                          <div className="text-xs">Loading results...</div>
                        ) : results && results.length > 0 ? (
                          <div className="space-y-2">
                            {results.map((r: any) => (
                              <div key={r.id} className="border rounded p-1 bg-gray-50">
                                <div className="flex items-center gap-2 text-xs mb-1">
                                  <span className="font-medium">{name(r.reported_by)}</span>
                                  <span className="text-gray-400 ml-1">{new Date(r.created_at).toLocaleString()}</span>
                                  <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: r.status === 'confirmed' ? '#16a34a' : r.status === 'disputed' ? '#ef4444' : '#e5e7eb', color: r.status === 'confirmed' ? '#fff' : '#111' }}>{r.status}</span>
                                </div>
                                <div className="text-xs text-gray-700 mb-1">Score: {r.score_player1} - {r.score_player2}</div>
                                {r.screenshot_url && (
                                  <div className="mb-1">
                                    <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer">
                                      <img src={r.screenshot_url} alt="Screenshot" className="max-h-24 rounded border" style={{ maxWidth: 160 }} />
                                    </a>
                                  </div>
                                )}
                                {/* Video proof support (future):
                                {r.video_url && (
                                  <div className="mb-1">
                                    <video src={r.video_url} controls className="max-h-24 rounded border" style={{ maxWidth: 160 }} />
                                  </div>
                                )}
                                */}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">No results submitted yet.</div>
                        )}
                      </div>
                      {involved && m.status !== 'completed' && (
                        <div style={{ marginTop: 8 }}>
                          <Link
                            to={`/tournaments/${id}/submit/${m.id}`}
                            style={{ color: '#4f46e5', textDecoration: 'underline' }}
                          >
                            Submit Result
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* Tournament Winner Display */}
      {sortedRoundNumbers.length > 0 && data?.t?.winner_id && (
        <div className="flex flex-col items-center mt-10">
          <img src={winnerImg} alt="Tournament Winner" style={{ height: 80, marginBottom: 12 }} />
          <div className="text-2xl font-bold text-primary-600">Tournament Winner</div>
          <div className="text-xl font-semibold mt-2">{name(data.t.winner_id)}</div>
        </div>
      )}
    </div>
  );
}