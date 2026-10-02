import React from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';

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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#03040a] text-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white">
            Login
          </h1>
          <p className="mt-2 text-sm text-slate-300">Welcome back to the arena.</p>
        </div>

        <Card className="bg-[#0a0c18] border-white/10 rounded-2xl">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/60 border-white/10 text-white placeholder:text-slate-500"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-black/60 border-white/10 text-white pr-16"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-cyan-300"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {err && (
              <div role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider"
            >
              {loading ? 'Signing in...' : 'Login'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-sm text-slate-300 text-center">
          No account?{' '}
          <Link to="/signup" className="text-cyan-300 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}