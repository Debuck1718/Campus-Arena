import React from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, SectionTitle, Select } from '../components/ui';

export function CreateTournament() {
  const nav = useNavigate();
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [platform, setPlatform] = React.useState('PlayStation');
  const [format, setFormat] = React.useState('single_elim');
  const [maxPlayers, setMaxPlayers] = React.useState(8);
  const [gameId, setGameId] = React.useState<string>('');
  const [games, setGames] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    supabase.from('games').select('id,name,slug').then(({ data }) => setGames(data || []));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) { setErr('Not authenticated'); setLoading(false); return; }
    const { data, error } = await supabase.rpc('create_tournament', {
      p_name: name,
      p_slug: slug || null,
      p_game_id: gameId,
      p_platform: platform,
      p_format: format,
      p_max_players: maxPlayers,
      p_visibility: 'public',
      p_rules: null,
      p_season_id: null
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    nav(`/tournaments/${data}`);
  }

  return (
    <div className="container max-w-2xl py-4">
      <SectionTitle>Create tournament</SectionTitle>
      <Card>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <Input value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Slug (optional)</label>
            <Input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="campus-cup" />
          </div>
          <div>
            <label className="label">Game</label>
            <Select value={gameId} onChange={e=>setGameId(e.target.value)} required>
              <option value="">Select game</option>
              {games.map(g=> <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="label">Platform</label>
            <Select value={platform} onChange={e=>setPlatform(e.target.value)}>
              <option>PlayStation</option><option>Xbox</option><option>PC</option><option>Mobile</option>
            </Select>
          </div>
          <div>
            <label className="label">Format</label>
            <Select value={format} onChange={e=>setFormat(e.target.value)}>
              <option value="single_elim">Single Elimination</option>
              <option value="round_robin">Round Robin</option>
            </Select>
          </div>
          <div>
            <label className="label">Max players</label>
            <Input type="number" min={2} max={256} value={maxPlayers} onChange={e=>setMaxPlayers(parseInt(e.target.value||'0'))} />
          </div>
          {err && <div className="sm:col-span-2 text-sm text-red-600">{err}</div>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}