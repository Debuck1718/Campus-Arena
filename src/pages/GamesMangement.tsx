import React from 'react';
import { supabase } from '../supabaseClient';
import { isCurrentUserAdmin } from '../lib/admin';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select } from '../components/ui';
import { 
  Gamepad2, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  LayoutGrid, 
  Monitor,
  Smartphone,
  Cpu
} from 'lucide-react';

export function GamesManagement() {
  const nav = useNavigate();
  const [games, setGames] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

  // Form State
  const [newName, setNewName] = React.useState('');
  const [newSlug, setNewSlug] = React.useState('');
  const [newPlatform, setNewPlatform] = React.useState('All');
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    async function init() {
      const adminStatus = await isCurrentUserAdmin();
      if (!adminStatus) {
        nav('/tournaments');
        return;
      }
      setIsAdmin(true);
      fetchGames();
    }
    init();
  }, [nav]);

  async function fetchGames() {
    setLoading(true);
    const { data } = await supabase.from('games').select('*').order('name');
    setGames(data || []);
    setLoading(false);
  }

  async function handleAddGame(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    
    const { error } = await supabase
      .from('games')
      .insert([{ 
        name: newName, 
        slug: newSlug.toLowerCase().replace(/\s+/g, '-'),
        platform: newPlatform 
      }]);

    if (!error) {
      setNewName('');
      setNewSlug('');
      setNewPlatform('All');
      fetchGames();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Deleting this game may break existing tournament links. Proceed?')) return;
    const { error } = await supabase.from('games').delete().eq('id', id);
    if (!error) fetchGames();
  }

  const getPlatformIcon = (plat: string) => {
    if (plat === 'Mobile') return <Smartphone size={10} />;
    if (plat === 'PC') return <Cpu size={10} />;
    return <Monitor size={10} />;
  };

  if (isAdmin === null || loading) return <div className="min-h-screen bg-[#050505]" />;

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 pt-12 max-w-5xl relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <button onClick={() => nav('/admin')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 group transition-all">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Command Center</span>
            </button>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">
              Game <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Registry</span>
            </h1>
          </div>
          
          <Card className="bg-[#0a0a0c] border-gray-800 p-6 rounded-2xl flex items-center gap-4 shadow-2xl">
            <div className="p-3 bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <LayoutGrid size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Live Disciplines</div>
              <div className="text-2xl font-black italic">{games.length}</div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar: Add Form */}
          <Card className="lg:col-span-1 bg-[#0a0a0c] border-gray-800 p-8 h-fit sticky top-8 rounded-3xl shadow-2xl border-t border-t-white/5">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-2 text-blue-500">
              <Plus size={16} /> New Entry
            </h2>
            <form onSubmit={handleAddGame} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Display Name</label>
                <Input 
                  placeholder="FC 26 / MK 1" 
                  value={newName} 
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setNewName(e.target.value)}
                  className="bg-black border-gray-800 font-black uppercase italic placeholder:text-gray-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-600 tracking-widest">System Slug</label>
                <Input 
                  placeholder="ea-sports-fc-26" 
                  value={newSlug} 
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setNewSlug(e.target.value)}
                  className="bg-black border-gray-800 font-mono text-xs text-blue-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Primary Platform</label>
                <Select 
                  value={newPlatform} 
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setNewPlatform(e.target.value)}
                  className="bg-black border-gray-800 font-bold"
                >
                  <option className="bg-black">All</option>
                  <option className="bg-black">PlayStation</option>
                  <option className="bg-black">Xbox</option>
                  <option className="bg-black">PC</option>
                  <option className="bg-black">Mobile</option>
                </Select>
              </div>
              <Button disabled={adding} className="w-full bg-blue-600 hover:bg-blue-500 py-7 font-black uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-blue-600/20">
                {adding ? 'Syncing...' : 'Register Title'}
              </Button>
            </form>
          </Card>

          {/* Main: Game List */}
          <div className="lg:col-span-2 space-y-3">
            {games.map(game => (
              <div 
                key={game.id} 
                className="group flex items-center justify-between p-6 bg-[#0a0a0c]/60 border border-gray-800/50 rounded-2xl hover:border-blue-500/40 hover:bg-blue-600/[0.02] transition-all duration-300"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center border border-gray-800 group-hover:border-blue-500/30 transition-all shadow-inner">
                    <Gamepad2 size={24} className="text-gray-700 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase italic tracking-tight text-lg leading-none mb-2">{game.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-black text-[9px] font-mono text-gray-500 rounded border border-gray-900 group-hover:text-blue-400 transition-colors">
                        /{game.slug}
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/5 text-[9px] font-black text-blue-500 uppercase tracking-widest rounded border border-blue-500/10">
                        {getPlatformIcon(game.platform)} {game.platform}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(game.id)}
                  className="p-4 text-gray-800 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}