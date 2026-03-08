import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';

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

      <h3 className="text-lg font-semibold mb-2">Bracket</h3>
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
                        <div style={{ marginTop: 6, fontSize: 14 }}>
                          Winner: <span style={{ fontWeight: 600 }}>{winner}</span>
                        </div>
                      )}
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
    </div>
  );
}