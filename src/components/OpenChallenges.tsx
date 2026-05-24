import React from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card } from './ui';
import { useNavigate } from 'react-router-dom';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useToast } from '../components/Toast';

export function OpenChallenges() {
  const [challenges, setChallenges] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentUid, setCurrentUid] = React.useState<string | null>(null);
  const nav = useNavigate();
  const notify = useToast();

  async function fetchChallenges(uid: string | null) {
    setLoading(true);
    let query = supabase
      .from('matches')
      .select('id, player1_id, created_at')
      .is('tournament_id', null)
      .is('player2_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    // CRITICAL FIX: Do not show my own open challenges to myself in the public lobby
    if (uid) {
      query = query.neq('player1_id', uid);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Open challenges fetch error', error);
      setChallenges([]);
    } else if (data) {
      setChallenges(data);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setCurrentUid(uid);
      fetchChallenges(uid);
    });
  }, []);

  const playerIds = challenges.map((challenge) => challenge.player1_id).filter(Boolean);
  const { nameMap } = useProfilesMap(playerIds);

  async function acceptChallenge(id: string) {
    if (!currentUid) {
      notify('You must be logged in to accept a challenge.', 'error');
      return;
    }

    // Atomic update: claim the open match slot safely
    const { data, error } = await supabase
      .from('matches')
      .update({ player2_id: currentUid, status: 'ongoing' }) // Update status to ongoing upon acceptance
      .eq('id', id)
      .is('player2_id', null)
      .select('id')
      .single();

    if (!error && data?.id) {
      notify('Challenge accepted! Opening combat room...', 'success');
      nav(`/matches/${data.id}`);
      return;
    }

    if (error) {
      console.error('Accept challenge failed', error);
      notify('Unable to accept challenge. Please try again.', 'error');
    } else {
      notify('This challenge has already been claimed by another operative.', 'info');
    }

    fetchChallenges(currentUid);
  }

  return (
    <Card className="p-4 bg-[#0a0a0c] border border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-500">Available Contracts</h3>
      </div>
      {loading ? (
        <div className="text-xs text-gray-500 animate-pulse font-mono">SCANNING FOR TARGETS...</div>
      ) : challenges.length === 0 ? (
        <div className="text-xs text-gray-500 italic">No open challenges. Trigger a Quick Match deployment.</div>
      ) : (
        <div className="space-y-3">
          {challenges.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-black/40 border border-gray-900 rounded-xl hover:border-gray-800 transition-colors">
              <div className="text-xs text-gray-300 font-medium">
                Challenge from <span className="font-black text-white uppercase tracking-tight">{nameMap.get(c.player1_id) || 'Unknown operative'}</span>
              </div>
              <Button 
                onClick={() => acceptChallenge(c.id)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-lg"
              >
                Accept
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
