import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { supabase } from './supabaseClient';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { CreateTournament } from './pages/CreateTournament';
import { Profile } from './pages/Profile';
import { SubmitResult } from './pages/SubmitResult';
import { MatchDetail } from './pages/MatchDetail';
import { Navbar } from './components/ui';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

const qc = new QueryClient();

function AuthGate() {
  const [session, setSession] = React.useState<any | null>(null);
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
    <div className="min-h-screen bg-gray-50">
      <Navbar onLogout={logout} />
      <main className="container py-6">
        <Outlet />
      </main>
      <footer className="mt-10 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} CampusArena •
        <a href="/privacy" className="ml-2 hover:underline text-primary-600">Privacy</a> •
        <a href="/terms" className="hover:underline text-primary-600">Terms</a>
      </footer>
    </div>
  );
}



const router = createBrowserRouter([
  {
    path: '/', element: <Layout />, children: [
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      {
        element: <AuthGate />, children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'tournaments', element: <Tournaments /> },
          { path: 'tournaments/create', element: <CreateTournament /> },
          { path: 'tournaments/:id', element: <TournamentDetail /> },
          { path: 'tournaments/:id/match/:matchId', element: <MatchDetail /> },
          { path: 'tournaments/:id/submit/:matchId', element: <SubmitResult /> },
          { path: 'profile', element: <Profile /> },
        ]
      },
      { path: '*', element: <NotFound /> }
    ]
  },
]);

import { ToastProvider } from './components/Toast';

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