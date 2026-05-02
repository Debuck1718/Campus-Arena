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
  TrendingUp
} from 'lucide-react';
import nbaImg from '../images/NBA.png';

// --- Database Fetcher ---
async function fetchTournaments() {
  const { data, error } = await supabase.from('tournaments')
    .select('id,name,platform,format,status,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --- Sub-Component: Gallery Zoom Screenshots ---
function TournamentScreenshots({ tournamentId }: { tournamentId: string }) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['tournamentScreenshots', tournamentId],
    queryFn: async () => {
      const { data: matches, error: matchErr } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId);
      if (matchErr) throw matchErr;
      const matchIds = (matches || []).map((m: any) => m.id);
      if (!matchIds.length) return [];

      const { data, error } = await supabase.from('match_results')
        .select('id, screenshot_url')
        .in('match_id', matchIds)
        .not('screenshot_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      const results = data || [];
      const paths = results.map((item: any) => item.screenshot_url).filter(Boolean);
      const signedMap = await getSignedUrls(paths);
      return results.map((item: any) => ({
        ...item,
        screenshot_url: item.screenshot_url ? signedMap[item.screenshot_url] ?? item.screenshot_url : null
      }));
    },
    enabled: !!tournamentId
  });

  if (isLoading) return <div className="h-16 w-full bg-gray-900/50 animate-pulse rounded-xl" />;

  if (!results?.length) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-gray-600 font-black uppercase tracking-widest italic py-2">
        <div className="w-1 h-1 rounded-full bg-gray-800" />
        No Field Data Recorded
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

// --- Sub-Component: Tournament Card ---
function TournamentCard({ t }: { t: any }) {
  return (
    <div className="group relative">
      {/* Background Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl blur opacity-0 group-hover:opacity-15 transition duration-500"></div>

      <Card className="relative bg-[#0a0a0c] border-gray-800 p-0 overflow-hidden rounded-2xl group-hover:border-gray-700 transition-all flex flex-col h-full shadow-2xl">
        <div className="p-6 flex flex-col h-full">
          {/* Header Info */}
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors uppercase italic tracking-tighter">
                {t.name}
              </h3>
              <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                <span className="flex items-center gap-1.5"><Globe size={12} className="text-blue-500/50" /> {t.platform}</span>
                <span className="flex items-center gap-1.5"><Layers size={12} className="text-blue-500/50" /> {t.format}</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border ${t.status === 'ongoing' ? 'bg-green-500/5 text-green-500 border-green-500/20' :
                t.status === 'open' ? 'bg-blue-500/5 text-blue-500 border-blue-500/20' :
                  'bg-gray-800/50 text-gray-500 border-gray-700'
              }`}>
              {t.status}
            </span>
          </div>

          {/* Screenshot Gallery Section */}
          <div className="bg-black/40 rounded-xl p-5 mb-8 border border-gray-800/60 shadow-inner relative overflow-hidden group/gallery">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-3xl pointer-events-none" />
            <p className="text-[9px] font-black text-blue-500/40 uppercase mb-4 flex items-center gap-2 tracking-[0.25em]">
              <ImageIcon size={12} /> Arena Highlights
            </p>
            <TournamentScreenshots tournamentId={t.id} />
          </div>

          {/* Action Button */}
          <div className="mt-auto">
            <Link to={`/tournaments/${t.id}`}>
              <Button variant="outline" className="w-full border-gray-800 text-gray-400 group-hover:border-blue-600 group-hover:text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl transition-all hover:bg-blue-600/5 active:scale-95">
                Enter Tournament Hub
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

// --- Main Page Component ---
export function Tournaments() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments
  });

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-24 relative overflow-hidden">

      {/* 1. LAYERED DECORATIVE BACKGROUNDS */}
      {/* Large Blurred Watermark Accent */}
      <img
        src={nbaImg}
        alt=""
        className="absolute top-40 left-1/2 -translate-x-1/2 w-full max-w-5xl opacity-[0.02] grayscale pointer-events-none blur-xl select-none"
      />
      {/* Corner Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[140px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">

        {/* 2. HERO HEADER SECTION */}
        <header className="pt-20 pb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-800/40 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <Trophy className="text-blue-500" size={28} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] ml-1">Elite Leagues</span>
                <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-white">
                  Tournament <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Arena</span>
                </h1>
              </div>
            </div>
            <p className="text-gray-500 font-medium max-w-lg border-l-2 border-blue-600 pl-6 py-1 leading-relaxed">
              Join the region's premier gaming circuits. Compete, track your progress, and climb the professional ladder.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/tournaments/create">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-7 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:scale-105 active:scale-95 group">
                <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Host Tournament
              </Button>
            </Link>
          </div>
        </header>

        {/* 3. TOURNAMENT STATS STRIP (Visual Decoration) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Active Games', val: data?.length || 0, icon: <LayoutGrid size={14} /> },
            { label: 'Live Events', val: data?.filter((t: any) => t.status === 'ongoing').length || 0, icon: <TrendingUp size={14} /> },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-900/30 border border-gray-800/50 p-4 rounded-xl backdrop-blur-sm">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2 mb-1">
                {stat.icon} {stat.label}
              </p>
              <p className="text-xl font-black text-white italic">{stat.val}</p>
            </div>
          ))}
        </div>

        {/* 4. MAIN TOURNAMENTS GRID */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-gray-900/40 animate-pulse rounded-2xl border border-gray-800" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-900/10 border border-red-500/30 p-8 rounded-2xl text-center">
            <p className="text-red-400 font-bold uppercase tracking-widest italic">Failed to retrieve arena data</p>
            <p className="text-red-500/60 text-xs mt-1">{(error as any).message}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {data?.map((t: any) => (
              <TournamentCard key={t.id} t={t} />
            ))}
          </div>
        )}

        {/* 5. EMPTY STATE */}
        {!isLoading && data?.length === 0 && (
          <div className="py-32 flex flex-col items-center text-center opacity-50 grayscale">
            <div className="w-20 h-20 border-2 border-dashed border-gray-700 rounded-full flex items-center justify-center mb-6">
              <Trophy size={40} className="text-gray-700" />
            </div>
            <h3 className="text-xl font-black uppercase text-gray-500">The Arena is Empty</h3>
            <p className="text-sm text-gray-600">Be the first to create a legend by hosting a tournament.</p>
          </div>
        )}
      </div>
    </div>
  );
}