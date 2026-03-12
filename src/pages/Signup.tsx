import React from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, SectionTitle } from '../components/ui';

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
    <div className="container max-w-md py-8">
      <SectionTitle>Sign up</SectionTitle>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <Input 
              id="email"
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <Input 
                id="password"
                type={show ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="absolute right-2 top-2 text-xs text-gray-500" 
                onClick={() => setShow(s => !s)}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="username" className="label">Username</label>
            <Input 
              id="username"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              minLength={3} 
              maxLength={24} 
            />
          </div>

          <div>
            <label className="label mb-2 block">Platforms (Select all that apply)</label>
            <div className="grid grid-cols-2 gap-2">
              {availablePlatforms.map((p) => (
                <label key={p} className="flex items-center space-x-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-gray-600 text-center">
        Have an account? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}