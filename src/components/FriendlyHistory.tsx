import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFriendlyMatches, FriendlyMatch } from '../hooks/useFriendlyMatches';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { Avatar } from './ui';

export function FriendlyHistory({ uid }: { uid?: string | null }) {
  const { matches, loading } = useFriendlyMatches(uid || undefined);
  const nav = useNavigate();

  // Resolve display names for both players instead of surfacing raw UUIDs.
  const ids = React.useMemo(
    () =>
      Array.from(
        new Set(
          matches
            .flatMap((m: FriendlyMatch) => [m.player1_id, m.player2_id])
            .filter((v): v is string => Boolean(v))
        )
      ),
    [matches]
  );

  const { nameMap, avatarMap } = useProfilesMap(ids);

  const nameOf = (pid?: string | null) => {
    if (!pid) return 'Open Slot';
    if (pid === uid) return 'You';
    return nameMap.get(pid) || 'Player';
  };

  const wins = matches.filter((m) => m.winner_id && m.winner_id === uid).length;
  const losses = matches.filter((m) => m.winner_id && m.winner_id !== uid).length;
  const total = matches.length;

  const statusTone = (m: FriendlyMatch) => {
    if (m.winner_id === uid) return 'text-emerald-300';
    if (m.winner_id) return 'text-rose-300';
    return 'text-slate-300';
  };

  const statusLabel = (m: FriendlyMatch) => {
    if (m.winner_id === uid) return 'Win';
    if (m.winner_id) return 'Loss';
    if (m.status === 'pending') return 'Awaiting';
    return m.status;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-100">Friendly History</div>
          <div className="text-[11px] text-slate-300">Recent friendly matches and stats</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-black text-slate-50">
            <span className="text-emerald-300">{wins}W</span>
            <span className="text-slate-400"> / </span>
            <span className="text-rose-300">{losses}L</span>
          </div>
          <div className="text-[11px] text-slate-300">{total} matches</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-300">Loading history...</div>
      ) : matches.length === 0 ? (
        <div className="text-sm text-slate-300">No friendly matches yet.</div>
      ) : (
        <ul className="space-y-2">
          {matches.map((m: FriendlyMatch) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => nav(`/matches/${m.id}`)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-left transition-colors hover:border-cyan-500/40 hover:bg-slate-900"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={avatarMap.get(m.player1_id || '') || null}
                    alt={nameOf(m.player1_id)}
                    size={26}
                  />

                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-100 truncate">
                      {nameOf(m.player1_id)} <span className="text-slate-400 font-normal">vs</span>{' '}
                      {nameOf(m.player2_id)}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {m.game?.name || 'Friendly Match'} ·{' '}
                      {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <span className={`shrink-0 text-[11px] font-black uppercase ${statusTone(m)}`}>
                  {statusLabel(m)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
