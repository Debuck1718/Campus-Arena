import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getSignedUrls } from '../lib/storage';
import { Button, Card } from '../components/ui';
import {
  Trophy,
  Plus,
  Globe,
  Layers,
  Image as ImageIcon,
  LayoutGrid,
  TrendingUp,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import nbaImg from '../images/NBA.png';

interface TournamentRow {
  id: string;
  name: string;
  platform: string | null;
  format: string | null;
  status: string | null;
  created_at: string;
}

async function fetchTournaments(): Promise<TournamentRow[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id,name,platform,format,status,created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as TournamentRow[];
}

function TournamentScreenshots({ tournamentId }: { tournamentId: string }) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['tournamentScreenshots', tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId);

      if (matchErr) throw matchErr;

      const matchIds = (matches || []).map((m: any) => m.id);
      if (!matchIds.length) return [];

      const { data, error } = await supabase
        .from('match_results')
        .select('id, screenshot_url')
        .in('match_id', matchIds)
        .eq('status', 'confirmed')
        .not('screenshot_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      const rows = data || [];
      const paths = rows.map((item: any) => item.screenshot_url).filter(Boolean);
      const signedMap = await getSignedUrls(paths);

      return rows.map((item: any) => ({
        ...item,
        screenshot_url: item.screenshot_url
          ? signedMap[item.screenshot_url] ?? item.screenshot_url
          : null,
      }));
    },
  });

  if (isLoading) {
    return <div className="h-16 w-full bg-gray-900/60 animate-pulse rounded-xl" />;
  }

  if (!results?.length) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest italic py-2">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
        No verified match evidence yet
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {results.map((r: any) => (
        <a
          key={r.id}
          href={r.screenshot_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative group/img w-16 h-16 rounded-lg overflow-hidden border border-gray-800 hover:border-blue-500 transition-all shadow-2xl"
        >
          <img
            src={r.screenshot_url}
            alt="Match Evidence"
            className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-150"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300" />
        </a>
      ))}
    </div>
  );
}

function TournamentCard({ t }: { t: TournamentRow }) {
  const status = t.status || 'unknown';

  return (
    <div className="group relative min-w-0">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500" />

      <Card className="relative bg-gradient-to-br from-[#08090d] via-[#0b0f18] to-[#050505] border-gray-800 p-0 overflow-hidden rounded-2xl group-hover:border-blue-500/30 transition-all flex flex-col h-full shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-600" />

        <div className="p-5 sm:p-6 flex flex-col h-full">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div className="space-y-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-blue-300 transition-colors uppercase italic tracking-tighter truncate">
                {t.name}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-gray-300 uppercase tracking-[0.15em]">
                <span className="flex items-center gap-1.5">
                  <Globe size={12} className="text-blue-400" />
                  {t.platform || 'Any Platform'}
                </span>

                <span className="flex items-center gap-1.5">
                  <Layers size={12} className="text-cyan-400" />
                  {t.format || 'Format TBA'}
                </span>
              </div>
            </div>

            <span
              className={`shrink-0 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                status === 'ongoing'
                  ? 'bg-green-500/10 text-green-300 border-green-500/30'
                  : status === 'open'
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : 'bg-gray-800/70 text-gray-300 border-gray-700'
              }`}
            >
              {status}
            </span>
          </div>

          <div className="bg-black/40 rounded-xl p-5 mb-8 border border-gray-800/60 shadow-inner relative overflow-hidden group/gallery">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 blur-3xl pointer-events-none" />

            <p className="text-[9px] font-black text-blue-300 uppercase mb-4 flex items-center gap-2 tracking-[0.25em]">
              <ImageIcon size={12} /> Arena Highlights
            </p>

            <TournamentScreenshots tournamentId={t.id} />
          </div>

          <div className="mt-auto">
            <Link to={`/tournaments/${t.id}`}>
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-200 group-hover:border-blue-500 group-hover:text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl transition-all hover:bg-blue-600/10 active:scale-95"
              >
                Enter Tournament Hub
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function Tournaments() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments,
  });

  const activeCount = data.length;
  const liveCount = data.filter((t) => t.status === 'ongoing').length;

  return (
    <div className="min-h-screen bg-[#03040a] text-gray-100 pb-24 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.12),transparent_30%),linear-gradient(to_bottom,#03040a,#050505)]" />

      <img
        src={nbaImg}
        alt=""
        className="fixed top-40 left-1/2 -translate-x-1/2 w-full max-w-5xl opacity-[0.025] grayscale pointer-events-none blur-xl select-none"
      />

      <main className="container mx-auto px-4 relative z-10 pt-28 sm:pt-32 lg:pt-36">
        <header className="pb-10 sm:pb-14 border-b border-gray-800/60 mb-10 sm:mb-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-5 min-w-0">
              <div className="flex items-start sm:items-center gap-4">
                <div className="shrink-0 p-3 bg-blue-600/10 border border-blue-500/30 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.15)]">
                  <Trophy className="text-blue-400" size={30} />
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.35em]">
                    Elite Leagues
                  </span>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter text-white leading-none">
                    Tournament{' '}
                    <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                      Arena
                    </span>
                  </h1>
                </div>
              </div>

              <p className="text-gray-300 font-medium max-w-xl border-l-2 border-blue-600 pl-5 py-1 leading-relaxed">
                Join the region&apos;s premier gaming circuits. Compete, track your progress, and climb the professional ladder.
              </p>
            </div>

            <Link to="/tournaments/create" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 sm:px-10 py-6 sm:py-7 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.22)] hover:scale-[1.02] active:scale-95 group">
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                Host Tournament
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 sm:mb-12">
          <div className="bg-gray-950/70 border border-blue-500/20 p-5 rounded-2xl backdrop-blur-sm">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2 mb-2">
              <LayoutGrid size={14} className="text-blue-400" /> Active Games
            </p>

            <p className="text-2xl font-black text-white italic">{activeCount}</p>
          </div>

          <div className="bg-gray-950/70 border border-green-500/20 p-5 rounded-2xl backdrop-blur-sm">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-green-400" /> Live Events
            </p>

            <p className="text-2xl font-black text-white italic">{liveCount}</p>
          </div>

          <div className="bg-gray-950/70 border border-purple-500/20 p-5 rounded-2xl backdrop-blur-sm">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-purple-400" /> Verified Results
            </p>

            <p className="text-2xl font-black text-white italic">Secure</p>
          </div>

          <div className="bg-gray-950/70 border border-cyan-500/20 p-5 rounded-2xl backdrop-blur-sm">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-cyan-400" /> Arena Status
            </p>

            <p className="text-2xl font-black text-white italic">
              {activeCount > 0 ? 'Online' : 'Empty'}
            </p>
          </div>
        </section>

        {isLoading ? (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 bg-gray-900/50 animate-pulse rounded-2xl border border-gray-800"
              />
            ))}
          </section>
        ) : error ? (
          <section className="bg-red-900/10 border border-red-500/30 p-8 rounded-2xl text-center">
            <p className="text-red-300 font-bold uppercase tracking-widest italic">
              Failed to retrieve arena data
            </p>

            <p className="text-red-400/70 text-xs mt-2">
              {(error as any).message}
            </p>
          </section>
        ) : data.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 lg:gap-10">
            {data.map((t) => (
              <TournamentCard key={t.id} t={t} />
            ))}
          </section>
        ) : (
          <section className="py-28 flex flex-col items-center text-center">
            <div className="w-20 h-20 border-2 border-dashed border-gray-700 rounded-full flex items-center justify-center mb-6 bg-black/40">
              <Trophy size={38} className="text-gray-600" />
            </div>

            <h3 className="text-xl font-black uppercase text-gray-300">
              The Arena is Empty
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Be the first to create a legend by hosting a tournament.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}