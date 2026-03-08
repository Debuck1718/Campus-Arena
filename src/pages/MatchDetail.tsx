import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMatch } from '../hooks/useMatch';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { supabase } from '../supabaseClient';
import { Avatar, Card, SectionTitle } from '../components/ui';

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

  if (isLoading) return <div className="container py-6">Loading...</div>;
  if (error) return <div className="container py-6 text-red-600">{(error as any).message}</div>;
  if (!match) return <div className="container py-6">Not found</div>;

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
        {match.winner_id && <div className="mt-1 text-sm">Winner: <span className="font-semibold">{name(match.winner_id)}</span></div>}
        {match.scheduled_at && <div className="mt-1 text-xs text-gray-500">Scheduled: {new Date(match.scheduled_at).toLocaleString()}</div>}
        {match.deadline_at && <div className="mt-1 text-xs text-gray-500">Deadline: {new Date(match.deadline_at).toLocaleString()}</div>}
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