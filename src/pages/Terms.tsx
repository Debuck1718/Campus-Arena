import React from 'react';
import { SEO } from '../components/SEO';
import {
  ShieldCheck,
  Scale,
  Gavel,
  UserX,
  FileText,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

export function Terms(): JSX.Element {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 pb-20 relative overflow-hidden">
      <SEO title="Terms of Service • CampusArena" description="The official rules and legal guidelines for CampusArena." />

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="container max-w-5xl mx-auto px-4 pt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-12">

          {/* --- LEFT: NAVIGATION STICKY --- */}
          <aside className="md:w-64 shrink-0">
            <div className="sticky top-24 space-y-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6 px-4">Legal Directory</h3>
              <nav>
                {['User Conduct', 'Fair Play', 'Account Security', 'Dispute Resolution', 'Termination'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(' ', '-')}`}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all text-xs font-bold group"
                  >
                    {item}
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </a>
                ))}
              </nav>
              <div className="mt-8 p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-blue-500 mb-2 flex items-center gap-2">
                  <ShieldCheck size={12} /> Compliance
                </p>
                <p className="text-[10px] leading-relaxed text-blue-200/60">
                  By entering the Arena, you agree to abide by the Global Matchmaking Standards.
                </p>
              </div>
            </div>
          </aside>

          {/* --- RIGHT: CONTENT --- */}
          <main className="flex-1">
            <header className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500">
                  <FileText size={20} />
                </div>
                <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Terms of Service</h1>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <span>Version 2.0.4</span>
                <span className="w-1 h-1 bg-gray-800 rounded-full" />
                <span>Last Modified: {lastUpdated}</span>
              </div>
            </header>

            <div className="space-y-16 prose prose-invert prose-sm max-w-none">

              <section id="user-conduct">
                <div className="flex items-center gap-3 mb-6">
                  <Scale size={18} className="text-blue-500" />
                  <h2 className="text-xl font-black uppercase italic tracking-tight m-0 text-white">1. User Conduct</h2>
                </div>
                <p>
                  CampusArena is built on competitive integrity. Users must provide accurate identity information and maintain professional sportsmanship.
                  Harassment, hate speech, or toxic behavior in match lobbies or profiles will result in immediate sanctioning.
                </p>
              </section>

              <section id="fair-play">
                <div className="flex items-center gap-3 mb-6">
                  <Gavel size={18} className="text-blue-500" />
                  <h2 className="text-xl font-black uppercase italic tracking-tight m-0 text-white">2. Fair Play & Anti-Cheat</h2>
                </div>
                <div className="bg-[#0a0a0c] border border-gray-800 p-6 rounded-2xl space-y-4">
                  <p className="m-0 font-bold text-gray-400">The following actions are strictly prohibited:</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0 m-0">
                    <li className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-red-400/80">
                      <AlertCircle size={14} /> Result Manipulation
                    </li>
                    <li className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-red-400/80">
                      <AlertCircle size={14} /> Smurfing/Multi-Accounting
                    </li>
                    <li className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-red-400/80">
                      <AlertCircle size={14} /> Third-party Scripts
                    </li>
                    <li className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight text-red-400/80">
                      <AlertCircle size={14} /> Collusion/Match Fixing
                    </li>
                  </ul>
                </div>
              </section>

              <section id="account-security">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldCheck size={18} className="text-blue-500" />
                  <h2 className="text-xl font-black uppercase italic tracking-tight m-0 text-white">3. Account Responsibility</h2>
                </div>
                <p>
                  You are solely responsible for the security of your authentication tokens and account access. CampusArena staff will
                  never ask for your password. Any match results submitted via your account are deemed final unless proven otherwise through the
                  Dispute Resolution system.
                </p>
              </section>

              <section id="termination">
                <div className="flex items-center gap-3 mb-6">
                  <UserX size={18} className="text-red-500" />
                  <h2 className="text-xl font-black uppercase italic tracking-tight m-0 text-red-500">4. Service Suspension</h2>
                </div>
                <p className="border-l-2 border-red-900/50 pl-6 italic text-gray-400">
                  CampusArena reserves the right to terminate access, wipe career statistics, or ban hardware IDs of any user found to be
                  undermining the competitive ecosystem. Decisions made by the High Council (Admins) are final.
                </p>
              </section>

            </div>

            <footer className="mt-20 pt-10 border-t border-gray-900">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 text-center">
                © {new Date().getFullYear()} CampusArena Gaming Technologies • Accra, Ghana
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}