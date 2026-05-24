import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Card, SectionTitle, Button } from '../components/ui';
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

      // Pull current operative directories directly
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
      setErr('Session expired. Re-authenticate.');
      setLoading(false);
      return;
    }

    try {
      // Look for pre-existing pending tokens to eliminate abuse loops
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('player1_id', uid)
        .eq('player2_id', opponent)
        .eq('game_id', game)
        .eq('status', 'pending');

      if (existing && existing.length > 0) {
        setErr('A pending challenge already exists between you two for this game.');
        setLoading(false);
        return;
      }

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
        setErr('Deployment execution failure. Selection mapping error.');
        setLoading(false);
        return;
      }

      const selectedOpponent = users.find(u => u.id === opponent);
      const selectedGame = games.find(g => g.id === game);

      // Deploy telemetry notification package directly into their tray logs
      await supabase.from('notifications').insert({
        profile_id: opponent,
        type: 'match_challenge',
        payload: {
          match_id: data.id,
          game_id: game,
          created_by: uid,
          opponent_username: selectedOpponent?.username || 'Target User',
          game_name: selectedGame?.name || 'Arena Sandbox',
          message: `URGENT: Challenged by another player in ${selectedGame?.name || 'Simulation'}!`
        },
        read_at: null
      });

      notify('Challenge transmitted successfully!', 'success');
      setLoading(false);
      nav('/dashboard'); // Take them back to dashboard to track state confirmations
    } catch (ex) {
      setErr('Unexpected internal server interface disruption.');
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-lg py-12">
      <SectionTitle>Issue Direct Combat Contract</SectionTitle>
      <Card className="bg-[#0a0a0c] border border-gray-800 p-6 rounded-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Target Opponent</label>
            <select 
              className="w-full bg-black border border-gray-800 text-white rounded-xl p-3 font-semibold focus:border-blue-500 outline-none" 
              value={opponent} 
              onChange={e => setOpponent(e.target.value)} 
              required
            >
              <option value="" className="text-gray-500">Select opponent handle...</option>
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-[#0a0a0c]">
                  {u.username.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Combat Arena (Game)</label>
            <select 
              className="w-full bg-black border border-gray-800 text-white rounded-xl p-3 font-semibold focus:border-blue-500 outline-none" 
              value={game} 
              onChange={e => setGame(e.target.value)} 
              required
            >
              <option value="" className="text-gray-500">Select rule system...</option>
              {games.map(g => (
                <option key={g.id} value={g.id} className="bg-[#0a0a0c]">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {err && <div className="text-red-500 text-xs font-mono font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{err}</div>}
          
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl">
            {loading ? 'TRANSMITTING CODES...' : 'DISPATCH CHALLENGE'}
          </Button>
        </form>
      </Card>
    </div>
  );
}