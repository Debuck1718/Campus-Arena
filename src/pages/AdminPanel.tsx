import React from 'react';
import { makeAdmin, isCurrentUserAdmin } from '../lib/admin';
import { getAllUsers, removeUser, banUser, unbanUser, getAllMatchResults, removeMatchResult } from '../lib/moderation';
import { supabase } from '../supabaseClient';

export function AdminPanel() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [userId, setUserId] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [evidenceUrls, setEvidenceUrls] = React.useState<Record<string, string>>({});
  
  // Modal state for confirmation
  const [modal, setModal] = React.useState<{ 
    isOpen: boolean, 
    message: string, 
    onConfirm: () => Promise<void> 
  } | null>(null);

  React.useEffect(() => {
    isCurrentUserAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [userData, matchData] = await Promise.all([getAllUsers(), getAllMatchResults()]);
      setUsers(userData);
      setResults(matchData);

      const urls: Record<string, string> = {};
      for (const res of matchData) {
        if (res.screenshot_url) {
          const { data } = await supabase.storage
            .from('evidence')
            .createSignedUrl(res.screenshot_url, 3600);
          if (data) urls[res.id] = data.signedUrl;
        }
      }
      setEvidenceUrls(urls);
    } catch (e) {
      console.error("Error fetching admin data:", e);
    }
    setLoading(false);
  }

  async function handleMakeAdmin(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await makeAdmin(userId);
      setStatus('Admin added successfully!');
      setUserId('');
    } catch (err: any) {
      setStatus(err.message || 'Failed to add admin');
    }
  }

  if (!isAdmin) {
    return <div className="container py-10 text-center text-red-600">You do not have admin access.</div>;
  }

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      
      <form onSubmit={handleMakeAdmin} className="mb-6 bg-gray-50 p-4 rounded-lg">
        <label className="block mb-2 font-medium">User ID to make admin</label>
        <input
          className="input mb-2 block w-full border p-2"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="Enter user id (uuid)"
          required
        />
        <button className="btn btn-primary bg-blue-600 text-white px-4 py-2 rounded" type="submit">Add Admin</button>
      </form>

      {status && <div className="mb-4 p-2 bg-green-50 text-green-700 rounded">{status}</div>}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        {loading ? <div>Loading...</div> : (
          <table className="min-w-full text-sm mb-8 border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Username</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b">
                  <td className="p-2 font-mono text-xs border">{u.id}</td>
                  <td className="p-2 border">{u.username}</td>
                  <td className="p-2 flex gap-2 border">
                    <button className="text-yellow-600 hover:underline" onClick={() => setModal({ isOpen: true, message: "Ban this user?", onConfirm: async () => { await banUser(u.id); fetchData(); } })}>Ban</button>
                    <button className="text-green-600 hover:underline" onClick={async () => { await unbanUser(u.id); fetchData(); }}>Unban</button>
                    <button className="text-red-600 hover:underline" onClick={() => setModal({ isOpen: true, message: "Permanently remove this user?", onConfirm: async () => { await removeUser(u.id); fetchData(); } })}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className="text-xl font-semibold mb-2">Match Results</h2>
        {loading ? <div>Loading...</div> : (
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">Match ID</th>
                <th className="p-2 border">Evidence</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 border">{r.match_id}</td>
                  <td className="p-2 border">
                    {evidenceUrls[r.id] ? <a href={evidenceUrls[r.id]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a> : '—'}
                  </td>
                  <td className="p-2 border">
                    <button className="text-red-600 hover:underline" onClick={() => setModal({ isOpen: true, message: "Delete this match result?", onConfirm: async () => { await removeMatchResult(r.id); fetchData(); } })}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal?.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm">
            <p className="mb-4">{modal.message}</p>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-outline border px-4 py-2" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary bg-red-600 text-white px-4 py-2 rounded" onClick={async () => { await modal.onConfirm(); setModal(null); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}