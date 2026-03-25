import React from 'react';
import { makeAdmin, isCurrentUserAdmin } from '../lib/admin';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { 
  getAllUsers, 
  removeUser, 
  banUser, 
  unbanUser, 
  getAllMatchResults, 
  removeMatchResult,
  getAllDisputes,
  updateDisputeStatus
} from '../lib/moderation';
import { supabase } from '../supabaseClient';
import { 
  ShieldAlert, 
  Users, 
  Trophy, 
  UserPlus, 
  Ban, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  Gavel,
  Clock,
  ExternalLink,
  PlusCircle,
  Gamepad2,
  Zap
} from 'lucide-react';
import { Button, Card, Input } from '../components/ui';

// Updated Tab Types
type AdminTab = 'users' | 'matches' | 'disputes' | 'tournaments';

export function AdminPanel() {
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<AdminTab>('users');
  const [userId, setUserId] = React.useState('');
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  
  // Data States
  const [users, setUsers] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [disputes, setDisputes] = React.useState<any[]>([]);
  const [tournaments, setTournaments] = React.useState<any[]>([]); // New State
  const [evidenceUrls, setEvidenceUrls] = React.useState<Record<string, string>>({});
  
  const [modal, setModal] = React.useState<{ 
    isOpen: boolean, 
    message: string, 
    onConfirm: () => Promise<void> 
  } | null>(null);

  React.useEffect(() => {
    isCurrentUserAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const userData = await getAllUsers();
        setUsers(userData);
      } else if (activeTab === 'matches') {
        const matchData = await getAllMatchResults();
        setResults(matchData);
        const urls: Record<string, string> = {};
        for (const res of matchData) {
          if (res.screenshot_url) {
            const { data } = await supabase.storage.from('evidence').createSignedUrl(res.screenshot_url, 3600);
            if (data) urls[res.id] = data.signedUrl;
          }
        }
        setEvidenceUrls(urls);
      } else if (activeTab === 'disputes') {
        const disputeData = await getAllDisputes();
        setDisputes(disputeData);
      } else if (activeTab === 'tournaments') {
        // Fetch current tournaments for management
        const { data } = await supabase
          .from('tournaments')
          .select('*, games(name)')
          .order('created_at', { ascending: false });
        setTournaments(data || []);
      }
    } catch (e) {
      console.error("Admin Fetch Error:", e);
    }
    setLoading(false);
  }

  async function handleMakeAdmin(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await makeAdmin(userId);
      setStatus({ type: 'success', text: 'Administrative privileges granted.' });
      setUserId('');
      fetchData();
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Promotion failed.' });
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <ShieldAlert size={64} className="text-red-600 mb-4 animate-pulse" />
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Access Restricted</h1>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">Unauthorized personnel detected.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-red-600/5 blur-[120px] pointer-events-none" />

      <div className="container max-w-6xl mx-auto px-4 pt-12 relative z-10">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 bg-red-600 text-[9px] font-black uppercase rounded italic tracking-wider">Restricted Area</span>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">Command Center</h1>
              </div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Overseeing CampusArena Operations</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button 
                onClick={() => nav('/admin/games')}
                variant="outline"
                className="border-gray-800 text-gray-400 font-black uppercase text-[9px] tracking-widest flex items-center gap-2"
              >
                <Gamepad2 size={14} /> Game Registry
              </Button>
              <Button 
                onClick={() => nav('/create-tournament')}
                className="bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                <PlusCircle size={14} /> New Arena
              </Button>
            </div>
          </div>
          
          <nav className="flex gap-4 mt-8 border-b border-white/5 overflow-x-auto">
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={14}/>} label="Operatives" />
            <TabButton active={activeTab === 'tournaments'} onClick={() => setActiveTab('tournaments')} icon={<Trophy size={14}/>} label="Arenas" />
            <TabButton active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} icon={<Zap size={14}/>} label="Combat Logs" />
            <TabButton active={activeTab === 'disputes'} onClick={() => setActiveTab('disputes')} icon={<Gavel size={14}/>} label="Disputes" />
          </nav>
        </header>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="mb-12">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-4 flex items-center gap-2">
                <UserPlus size={14} /> Promote Agent
              </h3>
              <Card className="bg-[#0a0a0c] border-gray-800 p-6 rounded-2xl">
                <form onSubmit={handleMakeAdmin} className="flex flex-col md:flex-row gap-4">
                  <Input
                    className="flex-1 bg-black border-gray-800 font-bold"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    placeholder="User UUID (e.g. f47ac10b...)"
                    required
                  />
                  <Button type="submit" className="bg-red-600 text-white font-black uppercase text-[10px] px-8 py-6 rounded-xl">
                    Grant Admin
                  </Button>
                </form>
              </Card>
            </section>

            <AdminTable headers={['Agent ID', 'Handle', 'Sanctions']}>
              {loading ? <LoadingRow colSpan={3} /> : users.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.01] transition-colors border-b border-white/5">
                  <td className="p-5 font-mono text-[10px] text-gray-600">{u.id}</td>
                  <td className="p-5 font-bold uppercase italic text-sm">{u.username}</td>
                  <td className="p-5 flex justify-end gap-3">
                    <ActionButton color="text-yellow-600" icon={<Ban size={16}/>} onClick={() => setModal({ isOpen: true, message: `Ban ${u.username}?`, onConfirm: async () => { await banUser(u.id); fetchData(); } })} />
                    <ActionButton color="text-green-600" icon={<CheckCircle size={16}/>} onClick={async () => { await unbanUser(u.id); fetchData(); }} />
                    <ActionButton color="text-red-600" icon={<Trash2 size={16}/>} onClick={() => setModal({ isOpen: true, message: `Purge ${u.username}?`, onConfirm: async () => { await removeUser(u.id); fetchData(); } })} />
                  </td>
                </tr>
              ))}
            </AdminTable>
          </div>
        )}

        {/* --- TOURNAMENTS TAB --- */}
        {activeTab === 'tournaments' && (
          <AdminTable headers={['Arena Name', 'Game', 'Players', 'Actions']}>
            {loading ? <LoadingRow colSpan={4} /> : tournaments.map(t => (
              <tr key={t.id} className="hover:bg-white/[0.01] border-b border-white/5">
                <td className="p-5 font-bold uppercase italic text-sm">{t.name}</td>
                <td className="p-5 text-[10px] font-black uppercase text-blue-500">{t.games?.name || 'Unknown'}</td>
                <td className="p-5 text-[10px] font-mono text-gray-500">{t.max_players} CAP</td>
                <td className="p-5 text-right">
                  <div className="flex justify-end gap-3">
                    <ActionButton color="text-blue-500" icon={<ExternalLink size={16}/>} onClick={() => nav(`/tournaments/${t.id}`)} />
                    <ActionButton color="text-red-600" icon={<Trash2 size={16}/>} onClick={() => setModal({ isOpen: true, message: `Delete Tournament: ${t.name}?`, onConfirm: async () => { await supabase.from('tournaments').delete().eq('id', t.id); fetchData(); } })} />
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}

        {/* --- MATCHES TAB --- */}
        {activeTab === 'matches' && (
          <AdminTable headers={['Match Hash', 'Intel Preview', 'Oversight']}>
            {loading ? <LoadingRow colSpan={3} /> : results.map(r => (
              <tr key={r.id} className="hover:bg-white/[0.01] border-b border-white/5">
                <td className="p-5 font-mono text-[10px] text-gray-600">{r.match_id}</td>
                <td className="p-5">
                  {evidenceUrls[r.id] ? (
                    <a href={evidenceUrls[r.id]} target="_blank" className="text-blue-500 text-[10px] font-black uppercase flex items-center gap-2">
                      <Eye size={14} /> View Evidence
                    </a>
                  ) : <span className="text-gray-700 text-[10px] font-black uppercase italic">No File</span>}
                </td>
                <td className="p-5 text-right">
                  <ActionButton color="text-red-600" icon={<XCircle size={16}/>} onClick={() => setModal({ isOpen: true, message: "Invalidate result?", onConfirm: async () => { await removeMatchResult(r.id); fetchData(); } })} />
                </td>
              </tr>
            ))}
          </AdminTable>
        )}

        {/* --- DISPUTES TAB --- */}
        {activeTab === 'disputes' && (
          <AdminTable headers={['Reporter', 'Category', 'Status', 'Oversight']}>
            {loading ? <LoadingRow colSpan={4} /> : disputes.map(d => (
              <tr key={d.id} className="hover:bg-white/[0.01] border-b border-white/5">
                <td className="p-5 font-bold uppercase italic text-sm">{d.reporter?.username}</td>
                <td className="p-5">
                  <span className="text-[10px] font-black uppercase px-2 py-1 bg-white/5 rounded border border-white/10 text-gray-400">
                    {d.category}
                  </span>
                </td>
                <td className="p-5">
                  <span className={`text-[10px] font-black uppercase flex items-center gap-2 ${
                    d.status === 'pending' ? 'text-yellow-500' : d.status === 'resolved' ? 'text-green-500' : 'text-blue-500'
                  }`}>
                    <Clock size={12} /> {d.status}
                  </span>
                </td>
                <td className="p-5 text-right flex justify-end gap-3">
                  <ActionButton color="text-blue-500" icon={<ExternalLink size={16}/>} onClick={() => {/* Navigate to details */}} />
                  <ActionButton color="text-green-500" icon={<CheckCircle size={16}/>} onClick={async () => { await updateDisputeStatus(d.id, 'resolved'); fetchData(); }} />
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {modal?.isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <Card className="bg-[#0a0a0c] border-red-600/50 p-8 rounded-[2.5rem] max-w-sm w-full">
             <div className="flex justify-center mb-6 text-red-600"><AlertTriangle size={32} /></div>
            <p className="text-center font-bold uppercase italic text-sm text-gray-200 mb-8">{modal.message}</p>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="border-gray-800 text-gray-500 font-black uppercase text-[10px]" onClick={() => setModal(null)}>Abort</Button>
              <Button className="bg-red-600 text-white font-black uppercase text-[10px]" onClick={async () => { await modal.onConfirm(); setModal(null); }}>Confirm</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Sub-components for cleaner code
function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
      active ? 'text-red-500 border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'
    }`}>
      {icon} {label}
    </button>
  );
}

function AdminTable({ headers, children }: any) {
  return (
    <div className="bg-[#0a0a0c] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
              {headers.map((h: string) => <th key={h} className="p-5">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-20 text-center">
        <Loader2 className="animate-spin text-red-600 mx-auto" />
      </td>
    </tr>
  );
}

function ActionButton({ color, icon, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-2 ${color} hover:bg-white/5 rounded-lg transition-all`}>
      {icon}
    </button>
  );
}