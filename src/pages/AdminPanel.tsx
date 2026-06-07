import React from 'react';
import { makeAdmin, isCurrentUserAdmin } from '../lib/admin';
import { useNavigate } from 'react-router-dom';
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
import { getSignedUrls } from '../lib/storage';
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
  Gavel,
  Gamepad2,
  Zap,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { Button, Card, Input } from '../components/ui';

type AdminTab = 'users' | 'matches' | 'disputes' | 'tournaments';

// Inner component abstractions required by layout
const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 pb-4 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
      active ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
    }`}
  >
    {icon} {label}
  </button>
);

const AdminTable = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
  <div className="w-full overflow-x-auto bg-[#0a0a0c] border border-gray-800 rounded-2xl shadow-2xl">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-gray-800 bg-black/40 text-gray-500 text-[10px] font-black uppercase tracking-wider">
          {headers.map((h, idx) => (
            <th key={idx} className="p-5">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const LoadingRow = ({ colSpan }: { colSpan: number }) => (
  <tr>
    <td colSpan={colSpan} className="p-10 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
      Mapping Data Channels...
    </td>
  </tr>
);

const ActionButton = ({ color, icon, onClick }: { color: string; icon: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className={`p-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded-lg transition-transform active:scale-95 ${color}`}>
    {icon}
  </button>
);

export function AdminPanel() {
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<AdminTab>('users');
  const [userId, setUserId] = React.useState('');
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [users, setUsers] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [disputes, setDisputes] = React.useState<any[]>([]);
  const [tournaments, setTournaments] = React.useState<any[]>([]);
  const [evidenceUrls, setEvidenceUrls] = React.useState<Record<string, string>>({});

  const [modal, setModal] = React.useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => Promise<void>;
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
        const paths = matchData.map((res: any) => res.screenshot_url).filter(Boolean);
        const signedMap = await getSignedUrls(paths);
        for (const res of matchData) {
          if (res.screenshot_url) {
            urls[res.id] = signedMap[res.screenshot_url] || '';
          }
        }
        setEvidenceUrls(urls);
      } else if (activeTab === 'disputes') {
        const disputeData = await getAllDisputes();
        setDisputes(disputeData);
      } else if (activeTab === 'tournaments') {
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

            <div className="flex gap-3">
              <Button
                onClick={() => nav('/games')}
                variant="outline"
                className="border-gray-800 text-gray-400 font-black uppercase text-[9px] tracking-widest flex items-center gap-2"
              >
                <Gamepad2 size={14} /> Game Registry
              </Button>
              <Button
                onClick={() => nav('/tournaments/create')}
                className="bg-blue-600 text-white font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                <PlusCircle size={14} /> New Arena
              </Button>
            </div>
          </div>

          <nav className="flex gap-4 mt-8 border-b border-white/5 overflow-x-auto">
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={14} />} label="Operatives" />
            <TabButton active={activeTab === 'tournaments'} onClick={() => setActiveTab('tournaments')} icon={<Trophy size={14} />} label="Arenas" />
            <TabButton active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} icon={<Zap size={14} />} label="Combat Logs" />
            <TabButton active={activeTab === 'disputes'} onClick={() => setActiveTab('disputes')} icon={<Gavel size={14} />} label="Disputes" />
          </nav>
        </header>

        {status && (
          <div className={`mb-6 p-4 rounded-xl text-xs font-bold uppercase tracking-wider ${status.type === 'success' ? 'bg-green-950/40 text-green-400 border border-green-900' : 'bg-red-950/40 text-red-400 border border-red-900'}`}>
            {status.text}
          </div>
        )}

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
                    <ActionButton color="text-yellow-600" icon={<Ban size={16} />} onClick={() => setModal({ isOpen: true, message: `Ban ${u.username}?`, onConfirm: async () => { await banUser(u.id); fetchData(); } })} />
                    <ActionButton color="text-green-600" icon={<CheckCircle size={16} />} onClick={async () => { await unbanUser(u.id); fetchData(); }} />
                    <ActionButton color="text-red-600" icon={<Trash2 size={16} />} onClick={() => setModal({ isOpen: true, message: `Purge ${u.username}?`, onConfirm: async () => { await removeUser(u.id); fetchData(); } })} />
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
                    <ActionButton color="text-blue-500" icon={<ExternalLink size={16} />} onClick={() => nav(`/tournaments/${t.id}`)} />
                    <ActionButton color="text-red-600" icon={<Trash2 size={16} />} onClick={() => setModal({ isOpen: true, message: `Delete Tournament: ${t.name}?`, onConfirm: async () => { await supabase.from('tournaments').delete().eq('id', t.id); fetchData(); } })} />
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}

        {/* --- MATCHES TAB (COMBAT LOGS) --- */}
        {activeTab === 'matches' && (
          <AdminTable headers={['Match Hash', 'Intel Preview', 'Scores Reported', 'Oversight Actions']}>
            {loading ? (
              <LoadingRow colSpan={4} />
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
                  No match reports logged in historical buffer.
                </td>
              </tr>
            ) : (
              results.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.01] border-b border-white/5 transition-colors">
                  <td className="p-5 font-mono text-[10px] text-gray-400">
                    {r.match_id}
                  </td>
                  <td className="p-5">
                    {evidenceUrls[r.id] ? (
                      <a 
                        href={evidenceUrls[r.id]} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-500 text-[10px] font-black uppercase inline-flex items-center gap-2 hover:underline"
                      >
                        <Eye size={14} /> View Evidence
                      </a>
                    ) : (
                      <span className="text-gray-600 text-[10px] uppercase font-bold">No File Proof</span>
                    )}
                  </td>
                  <td className="p-5">
                    <div className="text-xs font-mono font-black text-gray-200">
                      P1: <span className="text-green-400">{r.score_player1}</span> | P2: <span className="text-cyan-400">{r.score_player2}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-mono text-amber-500 block mt-1">Status: {r.status}</span>
                  </td>
                  <td className="p-5">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        onClick={async () => {
                          await supabase.from('match_results').update({ status: 'confirmed' }).eq('id', r.id);
                          fetchData();
                        }} 
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 text-[10px] font-black uppercase rounded animate-in fade-in-50"
                      >
                        Confirm
                      </Button>
                      <Button 
                        onClick={async () => {
                          await supabase.from('match_results').update({ status: 'disputed' }).eq('id', r.id);
                          fetchData();
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 text-[10px] font-black uppercase rounded"
                      >
                        Dispute
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </AdminTable>
        )}

        {/* --- DISPUTES TAB --- */}
        {activeTab === 'disputes' && (
          <AdminTable headers={['Match ID', 'Reported Status', 'Actions']}>
            {loading ? <LoadingRow colSpan={3} /> : disputes.map(d => (
              <tr key={d.id} className="hover:bg-white/[0.01] border-b border-white/5">
                <td className="p-5 font-mono text-[10px] text-gray-500">{d.match_id}</td>
                <td className="p-5 text-xs uppercase font-bold text-red-400">{d.status}</td>
                <td className="p-5 text-right">
                  <div className="flex justify-end gap-2">
                    <Button onClick={async () => { await updateDisputeStatus(d.id, 'resolved'); fetchData(); }} className="bg-blue-600 text-white px-3 py-1 text-[10px] font-black uppercase rounded">Resolve</Button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      {/* Action Modal Confirmation Prompt */}
      {modal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-800 p-6 max-w-sm w-full text-center space-y-4">
            <p className="text-sm font-black uppercase tracking-wide text-white">{modal.message}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setModal(null)} variant="outline" className="border-gray-700 text-gray-400 font-bold uppercase text-[10px]">Cancel</Button>
              <Button onClick={async () => { await modal.onConfirm(); setModal(null); }} className="bg-red-600 text-white font-black uppercase text-[10px]">Confirm execution</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}