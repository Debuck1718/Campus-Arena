import React from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, SectionTitle } from '../components/ui';

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [show, setShow] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setErr(null);
  setLoading(true);
  
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) { 
    setErr(error.message); 
    setLoading(false); 
    return; 
  }

  // Fetch the role to decide where to navigate
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  setLoading(false);
  
  // Navigate based on role
  if (profile?.role === 'admin') {
    nav('/admin');
  } else {
    nav('/dashboard');
  }
}

  return (
    <div className="container max-w-md py-8">
      <SectionTitle>Login</SectionTitle>
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
          {err && <div className="text-sm text-red-600">{err}</div>}
          <Button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-gray-600">No account? <Link to="/signup" className="text-primary-600">Sign up</Link></p>
    </div>
  );
}