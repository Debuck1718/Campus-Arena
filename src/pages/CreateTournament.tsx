import React from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
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
  Layers
} from 'lucide-react';

export function CreateTournament() {
  const nav = useNavigate();
  
  // Form State
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [platform, setPlatform] = React.useState('PlayStation');
  const [format, setFormat] = React.useState('single_elim');
  const [maxPlayers, setMaxPlayers] = React.useState(8);
  const [gameId, setGameId] = React.useState<string>('');
  const [games, setGames] = React.useState<any[]>([]);
  
  // UI State
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    supabase.from('games').select('id,name,slug').then(({ data }) => setGames(data || []));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    
    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) { 
      setErr('Authentication required to host tournaments.'); 
      setLoading(false); 
      return; 
    }
    
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
    if (error) { 
      setErr(error.message); 
      return; 
    }
    
    setCreatedId(data); // Trigger the success modal
  }

  const copyLink = () => {
    const link = `${window.location.origin}/tournaments/${createdId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="container max-w-3xl mx-auto px-4 pt-12 relative z-10">
        
        {/* Back Navigation */}
        <button 
          onClick={() => nav('/tournaments')} 
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-all mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Return to Arena</span>
        </button>

        <header className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.2)]">
              <Trophy size={28} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">Deployment Phase</span>
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white">
                Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Tournament</span>
              </h1>
            </div>
          </div>
        </header>

        <Card className="bg-[#0a0a0c] border-gray-800 p-8 md:p-12 rounded-3xl shadow-2xl border-t border-t-white/5 relative overflow-hidden">
          <form onSubmit={submit} className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-10">
            
            {/* Tournament Name */}
            <div className="sm:col-span-2 space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-blue-500">
                <Rocket size={12} /> Tournament Title
              </label>
              <Input 
                value={name} 
                onChange={e=>setName(e.target.value)} 
                required 
                placeholder="e.g. GLOBAL ELITE SERIES"
                className="bg-black/50 border-gray-800 focus:border-blue-500 py-7 text-xl font-black uppercase italic placeholder:text-gray-800 transition-all"
              />
            </div>

            {/* URL Slug */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                <Globe size={12} /> Custom Slug
              </label>
              <Input 
                value={slug} 
                onChange={e=>setSlug(e.target.value)} 
                placeholder="elite-series-2026" 
                className="bg-black/50 border-gray-800 text-sm font-bold"
              />
            </div>

            {/* Game Discipline */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                <Gamepad2 size={12} /> Selected Game
              </label>
              <Select 
                value={gameId} 
                onChange={e=>setGameId(e.target.value)} 
                required
                className="bg-black/50 border-gray-800 text-sm font-bold"
              >
                <option value="" className="bg-black">Choose Discipline</option>
                {games.map(g=> <option key={g.id} value={g.id} className="bg-black">{g.name}</option>)}
              </Select>
            </div>

            {/* Platform Selection */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                <Settings size={12} /> Native Platform
              </label>
              <Select 
                value={platform} 
                onChange={e=>setPlatform(e.target.value)}
                className="bg-black/50 border-gray-800 text-sm font-bold"
              >
                <option className="bg-black">PlayStation</option>
                <option className="bg-black">Xbox</option>
                <option className="bg-black">PC</option>
                <option className="bg-black">Mobile</option>
              </Select>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                <Layers size={12} /> Match Logic
              </label>
              <Select 
                value={format} 
                onChange={e=>setFormat(e.target.value)}
                className="bg-black/50 border-gray-800 text-sm font-bold"
              >
                <option value="single_elim" className="bg-black">Single Elimination</option>
                <option value="round_robin" className="bg-black">Round Robin</option>
              </Select>
            </div>

            {/* Capacity */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                <Users size={12} /> Player Cap
              </label>
              <Input 
                type="number" 
                min={2} 
                max={256} 
                value={maxPlayers} 
                onChange={e=>setMaxPlayers(parseInt(e.target.value||'0'))}
                className="bg-black/50 border-gray-800 text-sm font-black"
              />
            </div>

            {/* Error Handling */}
            {err && (
              <div className="sm:col-span-2 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-black uppercase tracking-[0.2em] text-center">
                Critical System Error: {err}
              </div>
            )}

            {/* Submit */}
            <div className="sm:col-span-2 pt-8">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-2xl font-black uppercase tracking-[0.4em] transition-all shadow-[0_10px_40px_rgba(37,99,235,0.25)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Processing Data...' : 'Deploy Arena'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* --- SUCCESS MODAL --- */}
      {createdId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <Card className="max-w-md w-full bg-[#0a0a0c] border-blue-500/30 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />
            
            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
              <CheckCircle2 size={40} className="text-blue-500" />
            </div>

            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2">Arena Deployed</h2>
            <p className="text-gray-500 text-sm mb-8 font-medium italic">"{name}" is now live and accepting contestants.</p>

            <div className="space-y-4">
              <div className="bg-black border border-gray-800 p-4 rounded-xl flex items-center justify-between group">
                <span className="text-xs text-gray-500 truncate mr-4 font-mono italic">
                  {window.location.origin}/tournaments/{createdId}
                </span>
                <button 
                  onClick={copyLink}
                  className="p-2 hover:bg-blue-600/10 rounded-lg transition-colors text-blue-500"
                >
                  {copied ? <span className="text-[10px] font-black uppercase">Copied!</span> : <Copy size={16} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => nav('/tournaments')}
                  className="w-full border-gray-800 text-gray-500 font-black text-[10px] uppercase tracking-widest py-4"
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