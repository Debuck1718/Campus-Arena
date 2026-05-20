import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMatch } from '../hooks/useMatch';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { useMatchResults } from '../hooks/useMatchResults';
import { supabase } from '../supabaseClient';
import { Avatar, Card, Button } from '../components/ui';
import { Chat } from '../components/Chat';
import { useMatchChatId } from '../hooks/useMatchChatId';

// ... (keep your existing imports)

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
  const gameData = match?.games ?? null;
  const supportsInPerson = Array.isArray(gameData?.platform_support)
    ? gameData.platform_support.includes('In-Person')
    : false;

  if (isLoading) return <div className="container py-12 text-center text-gray-400">Loading Arena...</div>;
  if (!match) return <div className="container py-12 text-center text-red-500">Match not found.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl selection:bg-blue-500/30">
      <header className="mb-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          {match.tournaments?.name} <span className="text-blue-500">Fixtures</span>
        </h1>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-900 border-gray-800 shadow-2xl overflow-hidden">
            <div className="p-8 border-l-4 border-blue-600 bg-gradient-to-r from-blue-900/10 to-transparent">
              <div className="flex justify-between items-center py-4">
                <div className="text-sm uppercase tracking-[0.3em] text-blue-500 font-black">
                  {gameData?.name || 'Exhibition'}
                </div>

                {/* Player 1 Area */}
                <div className="flex flex-col items-center gap-4 flex-1">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition"></div>
                    {/* FIXED: Added 'alt' prop and passed size/className directly */}
                    <Avatar
                      src={avatar(match.player1_id)}
                      alt={name(match.player1_id)}
                      size={80}
                      className="border-2 border-gray-700 shadow-xl"
                    />
                  </div>
                  <span className="font-black text-xs uppercase tracking-widest text-white italic">{name(match.player1_id)}</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black text-gray-800 italic tracking-tighter">VS</span>
                  <div className="h-px w-12 bg-gray-800 mt-2"></div>
                </div>

                {/* Player 2 Area */}
                <div className="flex flex-col items-center gap-4 flex-1">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition"></div>
                    {/* FIXED: Added 'alt' prop and passed size/className directly */}
                    <Avatar
                      src={avatar(match.player2_id)}
                      alt={name(match.player2_id)}
                      size={80}
                      className="border-2 border-gray-700 shadow-xl"
                    />
                  </div>
                  <span className="font-black text-xs uppercase tracking-widest text-white italic">{name(match.player2_id)}</span>
                </div>

              </div>
            </div>
          </Card>

          {/* Additional Match Info Section could go here */}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-[#0a0a0c] border border-gray-800 p-4 text-sm text-gray-400">
            {supportsInPerson ? (
              <>
                This match supports in-person coordination. Use the chat below to agree on a hostel location and schedule your meetup.
              </>
            ) : (
              <>Use the chat below to agree on time, format, and match details with your opponent.</>
            )}
          </div>
          {/* Chat Container with stylized border */}
          <div className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/50 backdrop-blur-sm">
            <Chat chatId={chatId} />
          </div>

          {involved && match.status !== 'completed' && (
            <Link to={tournamentId ? `/tournaments/${tournamentId}/submit/${matchId}` : `/matches/${matchId}/submit`}>
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all uppercase tracking-widest text-xs">
                Submit Battle Result
              </Button>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}