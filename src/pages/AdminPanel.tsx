import React from 'react';
import { makeAdmin, isCurrentUserAdmin } from '../lib/admin';
import { getAllUsers, removeUser, banUser, unbanUser, getAllMatchResults, removeMatchResult } from '../lib/moderation';
import { supabase } from '../supabaseClient';

export function AdminPanel() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [userId, setUserId] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    isCurrentUserAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const users = await getAllUsers();
      setUsers(users);
      const results = await getAllMatchResults();
      setResults(results);
    } catch (e) { }
    setLoading(false);
  }

  async function handleMakeAdmin(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await makeAdmin(userId);
      setStatus('Admin added successfully!');
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
      <form onSubmit={handleMakeAdmin} className="mb-6">
        <label className="label">User ID to make admin</label>
        <input
          className="input mb-2"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="Enter user id (uuid)"
          required
        />
        <button className="btn btn-primary" type="submit">Add Admin</button>
      </form>
      {status && <div className="mb-4 text-green-600">{status}</div>}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        {loading ? <div>Loading...</div> : (
          <table className="min-w-full text-sm mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">ID</th>
                <th className="p-2">Username</th>
                <th className="p-2">Email</th>
                <th className="p-2">Platform</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{u.id}</td>
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.platform}</td>
                  <td className="p-2 flex gap-2">
                    <button className="btn btn-outline" onClick={async () => { await banUser(u.id); fetchData(); }}>Ban</button>
                    <button className="btn btn-outline" onClick={async () => { await unbanUser(u.id); fetchData(); }}>Unban</button>
                    <button className="btn btn-outline text-red-600" onClick={async () => { await removeUser(u.id); fetchData(); }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h2 className="text-xl font-semibold mb-2">Match Results</h2>
        {loading ? <div>Loading...</div> : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">ID</th>
                <th className="p-2">Match ID</th>
                <th className="p-2">Reported By</th>
                <th className="p-2">Screenshot</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{r.id}</td>
                  <td className="p-2">{r.match_id}</td>
                  <td className="p-2">{r.reported_by}</td>
                  <td className="p-2">
                    {r.screenshot_url ? <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">View</a> : '—'}
                  </td>
                  <td className="p-2">
                    <button className="btn btn-outline text-red-600" onClick={async () => { await removeMatchResult(r.id); fetchData(); }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
