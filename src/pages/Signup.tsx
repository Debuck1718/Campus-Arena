import React from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, SectionTitle, Select } from '../components/ui';

export function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [platform, setPlatform] = React.useState<'PlayStation' | 'Xbox' | 'PC' | 'Mobile' | ''>('');
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [show, setShow] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) { setErr(error?.message || 'Signup failed'); setLoading(false); return; }
    const uid = data.user.id;
    const { error: pe } = await supabase.from('profiles').insert({
      id: uid,
      username,
      platform: platform || null
    });
    setLoading(false);
    if (pe) { setErr(pe.message); return; }
    nav('/dashboard');
  }

  return (
    <div className="container max-w-md py-8">
      <SectionTitle>Sign up</SectionTitle>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Input type={show ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} required />
              <button type="button" className="absolute right-2 top-2 text-xs text-gray-500" onClick={()=>setShow(s=>!s)}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          <div>
            <label className="label">Username</label>
            <Input value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} maxLength={24} />
          </div>
          <div>
            <label className="label">Platform</label>
            <Select value={platform} onChange={e=>setPlatform(e.target.value as any)}>
              <option value="">Select platform</option>
              <option>PlayStation</option>
              <option>Xbox</option>
              <option>PC</option>
              <option>Mobile</option>
            </Select>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-gray-600">Have an account? <Link to="/login" className="text-primary-600">Log in</Link></p>
    </div>
  );
}