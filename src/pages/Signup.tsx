import React from 'react';
import clsx from 'clsx';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { SEO } from '../components/SEO';

export function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  // Changed to an array to support multiple platforms
  const [platforms, setPlatforms] = React.useState<string[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [show, setShow] = React.useState(false);

  const availablePlatforms = ['PlayStation', 'Xbox', 'PC', 'Mobile'];

  const togglePlatform = (p: string) => {
    setPlatforms(prev =>
      prev.includes(p)
        ? prev.filter(item => item !== p)
        : [...prev, p]
    );
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    // Metadata is sent here so the DB trigger can create the profile automatically
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://campus-arena.vercel.app/login',
        data: {
          username,
          platform: platforms // Sending the array
        }
      }
    });

    if (error || !data.user) {
      setErr(error?.message || 'Signup failed');
      setLoading(false);
      return;
    }

    // No manual profile insert needed! The database trigger handles it.
    setLoading(false);
    nav('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#03040a] text-slate-100">
      <SEO
        title="Sign Up — Join CampusArena"
        description="Create your free CampusArena player profile. Enter campus tournaments, challenge rivals 1v1 and start climbing the leaderboard."
        path="/signup"
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white">
            Sign up
          </h1>
          <p className="mt-2 text-sm text-slate-300">Create your player profile.</p>
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
                  autoComplete="new-password"
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

            <div>
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={24}
                className="bg-black/60 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Platforms
              </span>

              <div className="grid grid-cols-2 gap-2">
                {availablePlatforms.map((p) => (
                  <label
                    key={p}
                    className={clsx(
                      'flex items-center gap-2 border rounded-xl p-2.5 cursor-pointer transition-colors',
                      platforms.includes(p)
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={platforms.includes(p)}
                      onChange={() => togglePlatform(p)}
                      className="rounded border-white/20 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-200">{p}</span>
                  </label>
                ))}
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
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-sm text-slate-300 text-center">
          Have an account?{' '}
          <Link to="/login" className="text-cyan-300 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}