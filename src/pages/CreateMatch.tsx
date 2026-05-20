import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Card, SectionTitle, Input, Button } from '../components/ui';
import { useToast } from '../hooks/useNotifications';

interface UserOption {
  id: string;
  username: string;
  last_seen_at?: string;
  is_online?: boolean;
}

interface GameOption {
  id: string;
  name: string;
}

export function CreateMatch() {
  const [opponent, setOpponent] = useState('');
  const [game, setGame] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [games, setGames] = useState<GameOption[]>([]);
  const nav = useNavigate();
  const notify = useToast();

  React.useEffect(() => {
    async function loadData() {
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) return;

      const { data: userList, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, is_online, last_seen_at')
        .neq('id', uid)
        .order('username') as { data: UserOption[] | null; error: unknown };
      if (!usersError && userList) setUsers(userList);

      const { data: gameList, error: gamesError } = await supabase
        .from('games')
        .select('id, name')
        .order('name') as { data: GameOption[] | null; error: unknown };
      if (!gamesError && gameList) setGames(gameList);
    }
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) {
      setErr('Not authenticated');
      setLoading(false);
      return;
    }
    if (!opponent || !game) {
      setErr('Select opponent and game');
      setLoading(false);
      return;
    }

    try {
      // Check for duplicate pending match in same game
      const { data: existing, error: existingError } = await supabase
        .from('matches')
        .select('id')
        .eq('player1_id', uid)
        .eq('game_id', game)
        .is('tournament_id', null)
        .eq('status', 'pending')
        .limit(1) as { data: { id: string }[] | null; error: unknown };

      if (existingError) {
        setErr('Unable to create challenge. Please try again.');
        setLoading(false);
        return;
      }

      if (existing?.length) {
        setErr('You already have a pending challenge in this game. Wait until it is accepted or try a different game.');
        setLoading(false);
        return;
      }

      // Create the match
      const { data, error } = await supabase
        .from('matches')
        .insert({
          player1_id: uid,
          player2_id: opponent,
          game_id: game,
          status: 'pending',
          tournament_id: null,
          round_number: 1,
          match_number: 0
        })
        .select('id')
        .single() as { data: { id: string } | null; error: unknown };

      if (error || !data?.id) {
        const errorMsg = (error as any)?.message || 'Failed to create challenge';
        // Check if it's a foreign key or constraint error
        if (errorMsg.includes('foreign key') || errorMsg.includes('constraint')) {
          setErr('Invalid opponent or game selection. Please try again.');
        } else {
          setErr(errorMsg);
        }
        setLoading(false);
        return;
      }

      // Get opponent and game info for notification
      const selectedOpponent = users.find(u => u.id === opponent);
      const selectedGame = games.find(g => g.id === game);
      const isOpponentOnline = selectedOpponent?.is_online ?? false;

      // Send notification to opponent
      const notificationPayload = {
        match_id: data.id,
        game_id: game,
        created_by: uid,
        opponent_username: selectedOpponent?.username || 'Unknown Player',
        game_name: selectedGame?.name || 'Unknown Game',
        message: `${selectedOpponent?.username || 'A player'} challenged you to ${selectedGame?.name || 'a game'}!`
      };

      await supabase.from('notifications').insert({
        profile_id: opponent,
        type: 'match_challenge',
        payload: notificationPayload,
        read_at: null
      });

      if (!isOpponentOnline) {
        notify('Challenge sent! Your opponent will be notified when they come online.', 'info');
      } else {
        notify('Challenge sent to your opponent!', 'success');
      }

      setLoading(false);
      nav(`/matches/${data.id}`);
    } catch (ex: any) {
      setErr('An unexpected error occurred. Please try again.');
      console.error('Match creation error:', ex);
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-lg py-8">
      <SectionTitle>Challenge a Player</SectionTitle>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Opponent</label>
            <select className="input w-full" value={opponent} onChange={e => setOpponent(e.target.value)} required>
              <option value="">Select opponent</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.username} {u.is_online ? '🟢 Online' : '⚪ Offline'}
                </option>
              ))}
            </select>
            {opponent && (
              <p className="text-xs text-gray-500 mt-2">
                {users.find(u => u.id === opponent)?.is_online
                  ? '✓ This player is online right now'
                  : '⚠ This player is offline. They will receive a notification.'}
              </p>
            )}
          </div>
          <div>
            <label className="label">Game</label>
            <select className="input w-full" value={game} onChange={e => setGame(e.target.value)} required>
              <option value="">Select game</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {game && games.find(g => g.id === game)?.name.toLowerCase().includes('pes') && (
              <p className="text-xs text-blue-400 mt-2">
                ✓ In-person match - coordinate location in chat
              </p>
            )}
          </div>
          {err && <div className="text-red-500 text-xs">{err}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating Challenge...' : 'Create Match'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
