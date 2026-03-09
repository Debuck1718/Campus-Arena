import React from 'react';
import cupImg from '../images/cup1.png';
import { useParams, Link } from 'react-router-dom';
import { useMatch } from '../hooks/useMatch';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useMatchResults } from '../hooks/useMatchResults';
import { supabase } from '../supabaseClient';
import { Avatar, Card, SectionTitle } from '../components/ui';
import { Chat } from '../components/Chat';
import { useMatchChatId } from '../hooks/useMatchChatId';

export function MatchDetail() {
  const { matchId, id: tournamentId } = useParams<{ matchId: string; id: string }>();
  const { data: match, isLoading, error } = useMatch(matchId);
  const [uid, setUid] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const ids = [match?.player1_id, match?.player2_id, match?.winner_id].filter(Boolean) as string[];
  const { nameMap, avatarMap } = useProfilesMap(ids);
  const name = (pid?: string | null) => (pid ? nameMap.get(pid) || pid : 'TBD');
  const avatar = (pid?: string | null) => (pid ? avatarMap.get(pid) || null : null);
  const involved = uid && (uid === match?.player1_id || uid === match?.player2_id);

  // Fetch all submitted results for this match
  const { data: results, isLoading: loadingResults } = useMatchResults(matchId);

  if (isLoading) return <div className="container py-6">Loading...</div>;
  if (error) return <div className="container py-6 text-red-600">{(error as any).message}</div>;
  if (!match) return <div className="container py-6">Not found</div>;

  // Chat integration
  const chatId = useMatchChatId(matchId);

  return (
    <div className="container py-4">
      <SectionTitle>{match.tournaments?.name} • Round {match.round_number} • Match {match.match_number}</SectionTitle>
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar src={avatar(match.player1_id)} alt={name(match.player1_id)} size={40} />
            <div className="font-medium">{name(match.player1_id)}</div>
          </div>
          <span className="text-gray-400">vs</span>
          <div className="flex items-center gap-2">
            <Avatar src={avatar(match.player2_id)} alt={name(match.player2_id)} size={40} />
            <div className="font-medium">{name(match.player2_id)}</div>
          </div>
        </div>
        <div className="mt-3 text-sm">Status: {match.status}</div>
        {match.winner_id && (
          <div className="mt-1 text-sm flex items-center gap-2">
            <img src={cupImg} alt="Winner" style={{ height: 20 }} />
            Winner: <span className="font-semibold">{name(match.winner_id)}</span>
          </div>
        )}
        {match.scheduled_at && <div className="mt-1 text-xs text-gray-500">Scheduled: {new Date(match.scheduled_at).toLocaleString()}</div>}
        {match.deadline_at && <div className="mt-1 text-xs text-gray-500">Deadline: {new Date(match.deadline_at).toLocaleString()}</div>}
        {/* Submitted Results with Screenshots/Videos */}
        <div className="mt-4">
          <div className="font-semibold mb-2">Submitted Results</div>
          {loadingResults ? (
            <div>Loading results...</div>
          ) : results && results.length > 0 ? (
            <div className="space-y-3">
              {results.map((r: any) => (
                <div key={r.id} className="border rounded p-2 bg-gray-50">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Avatar src={avatar(r.reported_by)} alt={name(r.reported_by)} size={24} />
                    <span className="font-medium">{name(r.reported_by)}</span>
                    <span className="text-xs text-gray-500 ml-2">{new Date(r.created_at).toLocaleString()}</span>
                    <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: r.status === 'confirmed' ? '#16a34a' : r.status === 'disputed' ? '#ef4444' : '#e5e7eb', color: r.status === 'confirmed' ? '#fff' : '#111' }}>{r.status}</span>
                  </div>
                  <div className="text-xs text-gray-700 mb-1">Score: {r.score_player1} - {r.score_player2}</div>
                  {r.screenshot_url && (
                    <div className="mb-1">
                      <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer">
                        <img src={r.screenshot_url} alt="Screenshot" className="max-h-40 rounded border" style={{ maxWidth: 320 }} />
                      </a>
                    </div>
                  )}
                  {/* Video proof support (future):
                  {r.video_url && (
                    <div className="mb-1">
                      <video src={r.video_url} controls className="max-h-40 rounded border" style={{ maxWidth: 320 }} />
                    </div>
                  )}
                  */}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">No results submitted yet.</div>
          )}
        </div>
        {/* Chat UI */}
        <div className="mt-6">
          <Chat chatId={chatId} />
        </div>
      </Card>
      <div className="mt-3 flex items-center gap-4 text-sm">
        {involved && match.status !== 'completed' && tournamentId && (
          <Link to={`/tournaments/${tournamentId}/submit/${match.id}`} className="text-primary-600 hover:underline">Submit Result</Link>
        )}
        <Link to={`/tournaments/${tournamentId}`} className="text-primary-600 hover:underline">Back to tournament</Link>
      </div>
    </div>
  );
}