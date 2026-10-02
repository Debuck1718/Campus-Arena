import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export function NotFound(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[#03040a] text-slate-100">
      <SEO title="404 • CampusArena" description="Page not found" />

      <p className="text-7xl sm:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
        404
      </p>

      <h1 className="mt-4 text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">
        Page not found
      </h1>

      <p className="mt-2 max-w-sm text-sm text-slate-300">
        The page you are looking for does not exist or has been moved.
      </p>

      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}