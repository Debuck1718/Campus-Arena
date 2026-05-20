import React from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card } from './ui';
import { useNavigate } from 'react-router-dom';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useToast } from '../components/Toast';

export function OpenChallenges() {
  const [challenges, setChallenges] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const nav = useNavigate();
  const notify = useToast();

  async function fetchChallenges() {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('id, player1_id, created_at')
      .is('tournament_id', null)
      .is('player2_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);
    if (error) {
      console.error('Open challenges fetch error', error);
      setChallenges([]);
    } else if (data) {
      setChallenges(data);
    }
    setLoading(false);
  }

  React.useEffect(() => { fetchChallenges(); }, []);

  const playerIds = challenges.map((challenge) => challenge.player1_id).filter(Boolean);
  const { nameMap } = useProfilesMap(playerIds);

  async function acceptChallenge(id: string) {
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) {
      notify('You must be logged in to accept a challenge.', 'error');
      return;
    }

    // Attempt atomic update: only update if player2_id is still null
    const { data, error } = await supabase
      .from('matches')
      .update({ player2_id: uid })
      .eq('id', id)
      .is('player2_id', null)
      .select('id')
      .single();

    if (!error && data?.id) {
      notify('Challenge accepted! Opening match...', 'success');
      nav(`/matches/${data.id}`);
      return;
    }

    if (error) {
      console.error('Accept challenge failed', error);
      const message = (error as any)?.message || 'Unable to accept challenge. Please try again.';
      notify(message, 'error');
    } else {
      notify('This challenge is no longer available. Refreshing open challenges.', 'info');
    }

    fetchChallenges();
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold">Open Challenges</div>
      </div>
      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : challenges.length === 0 ? (
        <div className="text-sm text-gray-500">No open challenges. Try Quick Match.</div>
      ) : (
        <div className="space-y-2">
          {challenges.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3">
              <div className="text-sm">
                Challenge by <span className="font-semibold">{nameMap.get(c.player1_id) || 'Player'}</span>
              </div>
              <Button onClick={() => acceptChallenge(c.id)}>Accept</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
