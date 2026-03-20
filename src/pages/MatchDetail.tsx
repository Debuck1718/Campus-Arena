import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMatch } from '../hooks/useMatch';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useMatchResults } from '../hooks/useMatchResults';
import { supabase } from '../supabaseClient';
import { Avatar, Card, Button } from '../components/ui';
import { Chat } from '../components/Chat';
import { useMatchChatId } from '../hooks/useMatchChatId';

export function MatchDetail() {
  const { matchId, id: tournamentId } = useParams<{ matchId: string; id: string }>();
  const { data: match, isLoading } = useMatch(matchId);
  const [uid, setUid] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const ids = [match?.player1_id, match?.player2_id].filter(Boolean) as string[];
  const { nameMap, avatarMap } = useProfilesMap(ids);
  const chatId = useMatchChatId(matchId);

  const name = (pid?: string | null) => (pid ? nameMap.get(pid) || pid : 'TBD');
  const avatar = (pid?: string | null) => (pid ? avatarMap.get(pid) || null : null);
  const involved = uid && (uid === match?.player1_id || uid === match?.player2_id);

  if (isLoading) return <div className="container py-12 text-center">Loading...</div>;
  if (!match) return <div className="container py-12 text-center">Match not found.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Fixed: Replaced SectionTitle if it was causing issues with a standard h1 */}
      <h1 className="text-2xl font-bold mb-6">{match.tournaments?.name}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6 border-l-4 border-primary-600">
              <div className="flex justify-between items-center py-4">
                <div className="flex flex-col items-center gap-2">
                  {/* Fixed: Wrapped Avatar in a div to prevent size/class conflicts */}
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    <Avatar src={avatar(match.player1_id) || ''} />
                  </div>
                  <span className="font-semibold text-sm">{name(match.player1_id)}</span>
                </div>
                <span className="text-xl font-black text-gray-300">VS</span>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    <Avatar src={avatar(match.player2_id) || ''} />
                  </div>
                  <span className="font-semibold text-sm">{name(match.player2_id)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Chat chatId={chatId} />
          {involved && match.status !== 'completed' && (
            <Link to={`/tournaments/${tournamentId}/submit/${matchId}`}>
              <Button className="w-full">Submit Result</Button>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}