import React from 'react';
import { useFriendlyMatches } from '../hooks/useFriendlyMatches';
import { supabase } from '../supabaseClient';
import { Card, Button } from './ui';

export function FriendlyHistory({ uid }: { uid?: string | null }) {
  const { matches, loading } = useFriendlyMatches(uid || undefined);

  const wins = matches.filter(m => m.winner_id === uid).length;
  const losses = matches.filter(m => m.winner_id && m.winner_id !== uid).length;
  const total = matches.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold">Friendly History</div>
          <div className="text-xs text-gray-400">Recent friendly matches and stats</div>
        </div>
        <div className="text-sm text-right">
          <div className="font-bold">{wins}W / {losses}L</div>
          <div className="text-xs text-gray-400">{total} matches</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : matches.length === 0 ? (
        <div className="text-sm text-gray-500">No friendly matches yet.</div>
      ) : (
        <div className="space-y-2">
          {matches.map(m => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{m.player1_id === uid ? 'You' : m.player1_id} vs {m.player2_id === uid ? 'You' : (m.player2_id || 'Open')}</div>
                <div className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              <div className="text-xs">
                {m.winner_id ? (m.winner_id === uid ? <span className="text-green-400">Win</span> : <span className="text-red-400">Loss</span>) : <span className="text-gray-400">Pending</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
