import React from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { isCurrentUserAdmin } from '../lib/admin';
import { Button, Card, Input, Select } from '../components/ui';
import {
  Trophy,
  Globe,
  Settings,
  Users,
  Rocket,
  ArrowLeft,
  Gamepad2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export function CreateTournament() {
  const nav = useNavigate();

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [platform, setPlatform] = React.useState('PlayStation');
  const [format, setFormat] = React.useState('single_elim');
  const [maxPlayers, setMaxPlayers] = React.useState(8);
  const [gameId, setGameId] = React.useState<string>('');
  const [games, setGames] = React.useState<any[]>([]);

  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    async function checkAccess() {
      try {
        const adminStatus = await isCurrentUserAdmin();

        if (!adminStatus) {
          nav('/tournaments');
          return;
        }

        setIsAdmin(true);

        const { data, error } = await supabase
          .from('games')
          .select('id,name,slug')
          .order('name');

        if (error) throw error;

        setGames(data || []);
      } catch {
        nav('/tournaments');
      }
    }

    checkAccess();
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!name.trim()) {
      setErr('Tournament name is required.');
      return;
    }

    if (!gameId) {
      setErr('Please select a game discipline.');
      return;
    }

    if (maxPlayers < 2) {
      setErr('Player cap must be at least 2.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc('create_tournament', {
      p_name: name.trim(),
      p_slug: slug.trim() || null,
      p_game_id: gameId,
      p_platform: platform,
      p_format: format,
      p_max_players: maxPlayers,
      p_visibility: 'public',
      p_rules: null,
      p_season_id: null,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (data) {
      await supabase.from('notifications').insert({
        type: 'tournament_created',
        payload: {
          tournament_id: data,
          name: name.trim(),
          message: 'A new tournament is live. Join now and compete against your rivals.',
        },
        read_at: null,
      });
    }

    setCreatedId(data);
  }

  const copyLink = () => {
    if (!createdId) return;

    const link = `${window.location.origin}/tournaments/${createdId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#03040a] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />

        <span className="text-blue-400 font-black tracking-[0.35em] text-[10px] uppercase animate-pulse">
          Verifying Credentials
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#03040a] text-gray-100 pb-20 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.12),transparent_30%),linear-gradient(to_bottom,#03040a,#050505)]" />

      <main className="container max-w-4xl mx-auto px-4 pt-28 sm:pt-32 lg:pt-36 relative z-10">
        <button
          onClick={() => nav('/tournaments')}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-all mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">
            Return to Arena
          </span>
        </button>

        <header className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.25)] flex items-center justify-center">
              <Trophy size={28} className="text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={12} className="text-blue-400" />
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.35em]">
                  Admin Authorized
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white leading-none">
                Create{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Tournament
                </span>
              </h1>
            </div>
          </div>

          <p className="text-gray-300 text-sm max-w-2xl font-medium">
            Deploy a new tournament arena, select the game discipline, set player capacity, and allow competitors to join.
          </p>
        </header>

        <Card className="bg-gray-950/80 border-gray-800 p-5 sm:p-8 md:p-10 rounded-3xl shadow-2xl border-t border-t-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-56 h-56 bg-blue-600/10 blur-3xl pointer-events-none" />

          <form onSubmit={submit} className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-7 sm:gap-8">
            <div className="sm:col-span-2 space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
                <Rocket size={12} /> Tournament Title
              </label>

              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. GLOBAL ELITE SERIES"
                className="bg-black/60 border-gray-700 focus:border-blue-500 py-6 sm:py-7 text-lg sm:text-xl font-black uppercase italic placeholder:text-gray-700 transition-all text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300">
                <Globe size={12} /> Custom Slug
              </label>

              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="elite-series-2026"
                className="bg-black/60 border-gray-700 text-sm font-bold text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300">
                <Gamepad2 size={12} /> Selected Game
              </label>

              <Select
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                required
                className="bg-black/60 border-gray-700 text-sm font-bold text-white"
              >
                <option value="" className="bg-black">
                  Choose Discipline
                </option>

                {games.map((g) => (
                  <option key={g.id} value={g.id} className="bg-black">
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300">
                <Settings size={12} /> Native Platform
              </label>

              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="bg-black/60 border-gray-700 text-sm font-bold text-white"
              >
                <option className="bg-black">PlayStation</option>
                <option className="bg-black">Xbox</option>
                <option className="bg-black">PC</option>
                <option className="bg-black">Mobile</option>
                <option className="bg-black">PES / In-Person</option>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300">
                <Layers size={12} /> Match Logic
              </label>

              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="bg-black/60 border-gray-700 text-sm font-bold text-white"
              >
                <option value="single_elim" className="bg-black">
                  Single Elimination
                </option>

                <option value="round_robin" className="bg-black">
                  Round Robin
                </option>
              </Select>
            </div>

            <div className="space-y-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-300">
                <Users size={12} /> Player Cap
              </label>

              <Input
                type="number"
                min={2}
                max={256}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value || '0'))}
                className="bg-black/60 border-gray-700 text-sm font-black text-white"
              />
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
              <ShieldCheck size={18} className="text-blue-300 shrink-0 mt-0.5" />

              <div>
                <p className="text-white text-xs font-black uppercase tracking-widest">
                  Secure Tournament Deployment
                </p>

                <p className="text-gray-300 text-xs mt-1">
                  Only authorized admins can create tournament arenas. Players will join through the generated tournament hub.
                </p>
              </div>
            </div>

            {err && (
              <div className="sm:col-span-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-[10px] text-red-300 font-black uppercase tracking-[0.18em] text-center">
                Critical System Error: {err}
              </div>
            )}

            <div className="sm:col-span-2 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-7 sm:py-8 rounded-2xl font-black uppercase tracking-[0.3em] transition-all shadow-[0_10px_40px_rgba(37,99,235,0.25)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Processing Data...' : 'Deploy Arena'}
              </Button>
            </div>
          </form>
        </Card>
      </main>

      {createdId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <Card className="max-w-md w-full bg-[#0a0a0c] border-blue-500/30 p-8 text-center relative overflow-hidden rounded-3xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />

            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
              <CheckCircle2 size={40} className="text-blue-400" />
            </div>

            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2">
              Arena Deployed
            </h2>

            <p className="text-gray-300 text-sm mb-8 font-medium">
              &quot;{name}&quot; is now live and accepting contestants.
            </p>

            <div className="space-y-4">
              <div className="bg-black border border-gray-800 p-4 rounded-xl flex items-center justify-between group">
                <span className="text-xs text-gray-400 truncate mr-4 font-mono italic">
                  {window.location.origin}/tournaments/{createdId}
                </span>

                <button
                  type="button"
                  onClick={copyLink}
                  className="p-2 hover:bg-blue-600/10 rounded-lg transition-colors text-blue-400"
                >
                  {copied ? (
                    <span className="text-[10px] font-black uppercase">
                      Copied!
                    </span>
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => nav('/tournaments')}
                  className="w-full border-gray-700 text-gray-300 font-black text-[10px] uppercase tracking-widest py-4"
                >
                  Arena List
                </Button>

                <Link to={`/tournaments/${createdId}`} className="w-full">
                  <Button className="w-full bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest py-4 flex items-center justify-center gap-2">
                    Enter Hub <ExternalLink size={12} />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}