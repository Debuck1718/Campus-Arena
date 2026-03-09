import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useMatchResults } from '../hooks/useMatchResults';
import { Link } from 'react-router-dom';
import { Card, SectionTitle, Avatar } from '../components/ui';
import soccerImg from '../images/Soccer.png';

async function fetchUpcoming() {
  const { data, error } = await supabase
    .from('v_user_upcoming_matches')
    .select('*')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data;
}

export function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['upcoming'], queryFn: fetchUpcoming });
  const [uid, setUid] = React.useState<string | null>(null);
  React.useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const ids = (data || []).flatMap((m: any) => [m.player1_id, m.player2_id]).filter(Boolean) as string[];
  const { nameMap, avatarMap } = useProfilesMap(ids);
  const name = (pid?: string | null) => (pid ? (nameMap.get(pid) || pid) : 'TBD');
  const avatar = (pid?: string | null) => (pid ? (avatarMap.get(pid) || null) : null);

  return (
    <div className="container py-4">
      <div className="flex items-center gap-3 mb-6">
        <img src={soccerImg} alt="Soccer" style={{ height: 36 }} />
        <SectionTitle>Upcoming matches</SectionTitle>
      </div>
      <SectionTitle>Upcoming matches</SectionTitle>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-600">{(error as any).message}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((m: any) => {
          const involved = uid && (uid === m.player1_id || uid === m.player2_id);
          const { data: results, isLoading: loadingResults } = useMatchResults(m.match_id);
          return (
            <Card key={m.match_id}>
              <div className="text-sm text-gray-500">{m.tournament_name}</div>
              <div className="font-semibold">Round {m.round_number} • Match {m.match_number}</div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Avatar src={avatar(m.player1_id)} alt={name(m.player1_id)} />
                  <span>{name(m.player1_id)}</span>
                </div>
                <span className="text-gray-400">vs</span>
                <div className="flex items-center gap-2">
                  <Avatar src={avatar(m.player2_id)} alt={name(m.player2_id)} />
                  <span>{name(m.player2_id)}</span>
                </div>
              </div>
              <div className="text-sm">Status: {m.status}</div>
              <div className="text-xs text-gray-500">Scheduled: {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : 'TBD'}</div>
              <div className="text-xs text-gray-500">Deadline: {m.deadline_at ? new Date(m.deadline_at).toLocaleString() : '—'}</div>
              {/* Submitted Results with Screenshots/Videos */}
              <div className="mt-2">
                <div className="font-semibold text-xs mb-1">Submitted Results</div>
                {loadingResults ? (
                  <div className="text-xs">Loading results...</div>
                ) : results && results.length > 0 ? (
                  <div className="space-y-2">
                    {results.map((r: any) => (
                      <div key={r.id} className="border rounded p-1 bg-gray-50">
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className="font-medium">{name(r.reported_by)}</span>
                          <span className="text-gray-400 ml-1">{new Date(r.created_at).toLocaleString()}</span>
                          <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: r.status === 'confirmed' ? '#16a34a' : r.status === 'disputed' ? '#ef4444' : '#e5e7eb', color: r.status === 'confirmed' ? '#fff' : '#111' }}>{r.status}</span>
                        </div>
                        <div className="text-xs text-gray-700 mb-1">Score: {r.score_player1} - {r.score_player2}</div>
                        {r.screenshot_url && (
                          <div className="mb-1">
                            <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer">
                              <img src={r.screenshot_url} alt="Screenshot" className="max-h-24 rounded border" style={{ maxWidth: 160 }} />
                            </a>
                          </div>
                        )}
                        {/* Video proof support (future):
                          {r.video_url && (
                            <div className="mb-1">
                              <video src={r.video_url} controls className="max-h-24 rounded border" style={{ maxWidth: 160 }} />
                            </div>
                          )}
                          */}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No results submitted yet.</div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <Link to={`/tournaments/${m.tournament_id}`} className="text-primary-600 hover:underline">Tournament</Link>
                <Link to={`/tournaments/${m.tournament_id}/match/${m.match_id}`} className="text-primary-600 hover:underline">Match</Link>
                {involved && m.status !== 'completed' && (
                  <Link to={`/tournaments/${m.tournament_id}/submit/${m.match_id}`} className="text-primary-600 hover:underline">Submit</Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}