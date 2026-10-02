import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import './styles.css';
import { supabase } from './supabaseClient';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { CreateTournament } from './pages/CreateTournament';
import { Profile } from './pages/Profile';
import { PublicProfile } from './pages/PublicProfile';
import { SubmitResult } from './pages/SubmitResult';
import { MatchDetail } from './pages/MatchDetail';
import { CreateMatch } from './pages/CreateMatch';
import { Leaderboard } from './pages/Leaderboard';
import { Support } from './pages/Support';
import { GamesManagement } from './pages/GamesMangement';
import { Navbar } from './components/ui';
import { NotFound } from './pages/NotFound';
import { AdminPanel } from './pages/AdminPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { ToastProvider } from './components/Toast';

// Import the image correctly for Vite
import homeImg from './images/home.png';

const qc = new QueryClient();

function Home() {
  return (
    /* flex-col-reverse ensures image is on TOP for mobile, md:flex-row puts it on the RIGHT for desktop */
    <div className="flex flex-col-reverse md:flex-row items-center justify-between min-h-[80vh] gap-10 px-4 md:px-10">

      {/* Left side: Text Content */}
      <section className="flex-1 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="inline-block px-4 py-1 mb-6 text-sm font-semibold tracking-wide uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full">
          Welcome to the Arena
        </div>
        <h1 className="text-4xl md:text-6xl font-black leading-tight text-white mb-6">
          Compete, Connect &amp; <br />
          <span className="text-cyan-400">Celebrate</span>
        </h1>
        <p className="text-lg text-slate-300 mb-8 leading-relaxed">
          The ultimate platform for students to showcase their skills. Join thrilling tournaments,
          track your progress, and become part of a vibrant campus community.
          Whether you’re a casual player or a fierce competitor, there’s a place for you here.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center justify-center bg-blue-600 text-white font-bold py-4 px-10 rounded-full shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1 transition-all duration-300"
        >
          Get Started
        </Link>
      </section>

      {/* Right side (Top on Mobile): Image Section */}
      <section className="flex-1 flex justify-center items-center animate-in fade-in duration-1000">
        <div className="relative">
          {/* Subtle glow effect behind image */}
          <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-10 rounded-full"></div>
          <img
            src={homeImg}
            alt="CampusArena Preview"
            className="relative w-full max-w-lg h-auto rounded-2xl animate-bounce-slow"
            style={{
              animation: 'float 6s ease-in-out infinite',
              filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.1))'
            }}
          />
        </div>
      </section>

      {/* Inline styles for the floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}

function AuthGate() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);
  if (loading) return null;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

function Layout() {
  const nav = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    nav('/login');
  }

  return (
    <div className="min-h-screen bg-[#03040a] text-slate-100 flex flex-col overflow-x-hidden">
      <Navbar onLogout={logout} />

      <main className="grow w-full">
        <Outlet />
      </main>

      <footer className="relative z-10 py-8 border-t border-white/10 text-center text-sm text-slate-400 bg-[#03040a]">
        © {new Date().getFullYear()} CampusArena •
        <Link to="/privacy" className="ml-2 hover:text-cyan-300 transition-colors">
          Privacy
        </Link>{' '}
        •
        <Link to="/terms" className="ml-2 hover:text-cyan-300 transition-colors">
          Terms
        </Link>
      </footer>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/', element: <Layout />, children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'admin', element: <AdminPanel /> },
      { path: 'games', element: <GamesManagement /> },
      { path: 'signup', element: <Signup /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      { path: 'profile/:id', element: <PublicProfile /> },
      {
        element: <AuthGate />, children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'matches/new', element: <CreateMatch /> },
          { path: 'matches/:matchId', element: <MatchDetail /> },
          { path: 'matches/:matchId/submit', element: <SubmitResult /> },
          { path: 'tournaments', element: <Tournaments /> },
          { path: 'tournaments/create', element: <CreateTournament /> },
          { path: 'tournaments/:id', element: <TournamentDetail /> },
          { path: 'tournaments/:id/match/:matchId', element: <MatchDetail /> },
          { path: 'tournaments/:id/submit/:matchId', element: <SubmitResult /> },
          { path: 'profile', element: <Profile /> },
          { path: 'leaderboard', element: <Leaderboard /> },
          { path: 'support', element: <Support /> },
        ]
      },
      { path: '*', element: <NotFound /> }
    ]
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('CampusArena: SW Registered successfully on scope: ', reg.scope))
      .catch((err) => console.error('CampusArena: SW Registration failed: ', err));
  });
}