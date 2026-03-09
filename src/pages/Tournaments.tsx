import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, SectionTitle } from '../components/ui';
import { useQuery as useQueryTan } from '@tanstack/react-query';
import nbaImg from '../images/NBA.png';

async function fetchTournaments() {
  const { data, error } = await supabase.from('tournaments')
    .select('id,name,platform,format,status,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export function Tournaments() {
  const { data, isLoading, error } = useQuery({ queryKey: ['tournaments'], queryFn: fetchTournaments });
  return (
    <div className="container py-4">
      <div className="flex items-center gap-3 mb-6">
        <img src={nbaImg} alt="NBA" style={{ height: 36 }} />
        <SectionTitle>Tournaments</SectionTitle>
      </div>
      <div className="flex items-center justify-between">
        <SectionTitle>Tournaments</SectionTitle>
        <Link to="/tournaments/create"><Button>+ Create</Button></Link>
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-600">{(error as any).message}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((t: any) => {
          // Fetch recent screenshots for this tournament
          const { data: results, isLoading: loadingResults } = useQueryTan({
            queryKey: ['tournamentScreenshots', t.id],
            queryFn: async () => {
              const { data: matches } = await supabase
                .from('matches')
                .select('id')
                .eq('tournament_id', t.id);
              const matchIds = (matches || []).map((m: any) => m.id);
              if (!matchIds.length) return [];
              const { data: results } = await supabase
                .from('match_results')
                .select('id, screenshot_url, created_at')
                .in('match_id', matchIds)
                .order('created_at', { ascending: false })
                .limit(3);
              return results?.filter((r: any) => r.screenshot_url) || [];
            },
            enabled: !!t.id
          });
          return (
            <Card key={t.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.platform} • {t.format}</div>
                </div>
                <span className={`badge ${t.status === 'ongoing' ? 'badge-green' : t.status === 'open' ? 'badge-yellow' : 'badge-gray'}`}>{t.status}</span>
              </div>
              {/* Screenshot preview */}
              <div className="mt-2 flex gap-2">
                {loadingResults ? (
                  <span className="text-xs text-gray-400">Loading screenshots...</span>
                ) : results && results.length > 0 ? (
                  results.map((r: any) => (
                    <a key={r.id} href={r.screenshot_url} target="_blank" rel="noopener noreferrer">
                      <img src={r.screenshot_url} alt="Screenshot" className="max-h-16 rounded border" style={{ maxWidth: 64 }} />
                    </a>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No screenshots yet</span>
                )}
              </div>
              <div className="mt-3">
                <Link to={`/tournaments/${t.id}`} className="text-primary-600 hover:underline">View details →</Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}