import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Avatar, Button } from '../components/ui';
import { OpenChallenges } from '../components/OpenChallenges';
import { FriendlyHistory } from '../components/FriendlyHistory';
import { useToast } from '../components/Toast';
import { getEvidencePath } from '../lib/storage';
import { getRankTitle } from '../lib/ranking';
import {
  Target,
  LayoutDashboard,
  Check,
  X,
  Bell,
  MessageCircle,
  ShieldCheck,
  Gamepad2,
  Zap,
  Radio,
  ImageIcon
} from 'lucide-react';
import soccerImg from '../images/Soccer.png';

interface DashboardMatch {
  id?: string;
  match_id?: string;
  player1_id?: string | null;
  player2_id?: string | null;
  winner_id?: string | null;
  status?: string | null;
  created_at?: string;
  screenshot_url?: string | null;
  score_player1?: string | number | null;
  score_player2?: string | number | null;
  chat_id?: string | null;
  tournament_name?: string | null;
  scheduled_at?: string | null;
  reporter?: { username?: string | null; avatar_url?: string | null } | null;
  sender?: { username?: string | null; avatar_url?: string | null } | null;
  challenger?: { username?: string | null; avatar_url?: string | null } | null;
  games?: { name?: string | null } | null;
}

// Direct challenges are rows from the `challenges` table, keyed by `id`
// (unlike match_results rows, which are keyed by `match_id`).
interface DirectChallenge extends DashboardMatch {
  id: string;
  challenger: { username?: string | null; avatar_url?: string | null } | null;
  games: { name?: string | null } | null;
}

interface MatchCardProps {
  match: DashboardMatch;
  uid: string | null;
  name: (pid?: string | null) => string;
  avatar: (pid?: string | null) => string | null;
  resultStatus?: string;
}

interface GameOption {
  id: string;
  name: string;
}

interface RecentMessage {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  chat_id: string;
  sender?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  chats?: {
    id: string;
    match_id: string;
  } | null;
}

interface ConfirmedEvidence {
  id: string;
  match_id: string;
  reported_by: string;
  score_player1: number;
  score_player2: number;
  screenshot_url: string | null;
  created_at: string;
  signedUrl?: string;
  reporter?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

async function fetchUpcoming() {
  const { data, error } = await supabase
    .from('v_user_upcoming_matches')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function fetchGames() {
  const { data, error } = await supabase.from('games').select('id,name').order('name');

  if (error) throw error;
  return data as GameOption[];
}

async function getOrCreateMatchChat(matchId: string) {
  const { data: existingChat, error: fetchError } = await supabase
    .from('chats')
    .select('id')
    .eq('scope', 'match')
    .eq('match_id', matchId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existingChat?.id) return existingChat.id;

  const { data: newChat, error: insertError } = await supabase
    .from('chats')
    .insert({
      scope: 'match',
      match_id: matchId
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return newChat.id;
}

const EmptyState = () => (
  <div className="col-span-full relative overflow-hidden py-16 sm:py-20 flex flex-col items-center text-center bg-gradient-to-br from-gray-950 via-gray-900/80 to-blue-950/30 border border-blue-500/20 rounded-3xl backdrop-blur-sm shadow-2xl">
    <img
      src={soccerImg}
      alt=""
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 sm:w-72 opacity-5 grayscale pointer-events-none"
    />

    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%)]" />

    <div className="relative z-10 px-4">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-blue-500/30 shadow-[0_0_35px_rgba(59,130,246,0.25)]">
        <Target size={42} className="text-blue-400" />
      </div>

      <h3 className="text-xl sm:text-2xl font-black uppercase italic text-white mb-3">
        No Arena Activity
      </h3>

      <p className="text-gray-300 max-w-sm mb-8 px-2 font-medium">
        Your command center is clear. Find a tournament, challenge a rival, or start a quick match.
      </p>

      <Link to="/tournaments">
        <Button className="bg-blue-600 hover:bg-blue-500 text-white px-8 sm:px-10 py-4 sm:py-6 rounded-xl font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20">
          Find a Match
        </Button>
      </Link>
    </div>
  </div>
);

function StatTile({
  icon,
  label,
  value,
  sub,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
      <div
        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${tone}`}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 text-xl sm:text-2xl font-black italic leading-none text-white">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-slate-300 truncate">{sub}</p>
    </div>
  );
}

const MatchCard: React.FC<MatchCardProps> = ({ match, uid, name, avatar, resultStatus }) => {
  const involved = uid && (uid === match.player1_id || uid === match.player2_id);

  // Production note: `matches.match_results_status` does not exist. The
  // awaiting-approval state comes from the match_results row instead.
  const isPendingVerification = resultStatus === 'pending';

  const matchId = match.match_id as string;
  const score1 = match.score_player1;
  const score2 = match.score_player2;
  const hasScore =
    score1 !== null && score1 !== undefined && score2 !== null && score2 !== undefined;

  return (
    <div className="group relative min-w-0">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 via-cyan-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-45 transition duration-500" />

      <Card className="relative bg-gradient-to-br from-[#08080b] via-[#0c0f16] to-[#050505] border-gray-800 p-0 overflow-hidden rounded-2xl group-hover:border-blue-500/40 transition-all shadow-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-600" />

        <div className="p-4 sm:p-6 flex flex-col h-full">
          <div className="flex justify-between items-start gap-3 mb-8">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 truncate">
                {match.tournament_name || 'Exhibition Arena'}
              </span>

              <span className="text-[10px] text-gray-300 font-mono mt-1 font-bold uppercase">
                {match.scheduled_at
                  ? new Date(match.scheduled_at).toLocaleString([], {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Time TBA'}
              </span>
            </div>

            <div className="shrink-0 px-2.5 py-1 rounded-md bg-gray-950 border border-gray-700">
              <span
                className={`text-[9px] font-black uppercase tracking-wider ${
                  isPendingVerification ? 'text-amber-300 animate-pulse' : 'text-green-300'
                }`}
              >
                ● {isPendingVerification ? 'Pending Approval' : match.status}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-4 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

            <div className="flex flex-col items-center gap-3 z-10 flex-1 min-w-0">
              <Avatar
                src={avatar(match.player1_id) || ''}
                alt={name(match.player1_id)}
                className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-blue-500/30 shadow-lg shadow-blue-500/10"
              />

              <span className="text-xs sm:text-sm font-black text-white bg-gray-950/90 px-2 py-1 rounded-md border border-white/10 truncate w-full text-center uppercase tracking-wide">
                {name(match.player1_id)}
              </span>
            </div>

            <div className="z-10 bg-black px-3 py-1.5 border border-blue-500/40 rounded-lg shrink-0 shadow-lg shadow-blue-600/10">
              {hasScore ? (
                <span className="font-mono font-black text-cyan-300 text-sm">
                  {score1} : {score2}
                </span>
              ) : (
                <span className="text-cyan-300 font-black italic text-lg sm:text-xl">VS</span>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 z-10 flex-1 min-w-0">
              <Avatar
                src={avatar(match.player2_id) || ''}
                alt={name(match.player2_id)}
                className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-purple-500/30 shadow-lg shadow-purple-500/10"
              />

              <span className="text-xs sm:text-sm font-black text-white bg-gray-950/90 px-2 py-1 rounded-md border border-white/10 truncate w-full text-center uppercase tracking-wide">
                {name(match.player2_id)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-5 border-t border-gray-800">
            <Link to={`/matches/${matchId}`} className="flex-1">
              <Button
                variant="outline"
                className="w-full text-[10px] font-black border-blue-500/30 hover:bg-blue-600/10 text-gray-100 py-2 uppercase tracking-widest"
              >
                Combat Hub
              </Button>
            </Link>

            {involved && !isPendingVerification && match.status !== 'completed' && (
              <Link to={`/matches/${matchId}/submit`} className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-2 uppercase tracking-widest shadow-lg shadow-blue-600/20">
                  Report
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export function Dashboard() {
  const [uid, setUid] = React.useState<string | null>(null);
  const [selectedGame, setSelectedGame] = React.useState<string>('');
  const [incomingChallenges, setIncomingChallenges] = React.useState<DirectChallenge[]>([]);
  const [quickLoading, setQuickLoading] = React.useState(false);
  const [notificationOpen, setNotificationOpen] = React.useState(false);

  const nav = useNavigate();
  const notify = useToast();
  const queryClient = useQueryClient();

  // The view exposes `match_id` (not `id`) and has NO score columns.
  // `match_results_status` does not exist on matches in production, so the
  // "Pending Approval" state is derived from match_results instead.
  const { data, isLoading } = useQuery({
    queryKey: ['upcoming'],
    queryFn: fetchUpcoming
  });

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames
  });

  /**
   * Result status per match, so MatchCard can tell "awaiting admin approval"
   * apart from a match that simply hasn't been played yet.
   * Production note: matches has no match_results_status column.
   */
  const { data: resultStatusByMatch = new Map<string, string>() } = useQuery({
    queryKey: ['match-result-status'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('match_results')
        .select('match_id, status')
        .limit(500);

      if (error) throw error;

      const map = new Map<string, string>();
      for (const row of (rows || []) as { match_id: string; status: string }[]) {
        // Pending wins over anything else for UI purposes.
        if (map.get(row.match_id) !== 'pending') map.set(row.match_id, row.status);
      }
      return map;
    }
  });

  /**
   * Player summary for the stat strip.
   * Production note: rankings is keyed by profile_id and is season/game scoped,
   * so we take the top row rather than assuming a single global one.
   */
  const { data: myRanking } = useQuery({
    queryKey: ['my-ranking', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rankings')
        .select('points, wins, losses, matches_played, elo_rating')
        .eq('profile_id', uid!)
        .order('points', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as {
        points: number;
        wins: number;
        losses: number;
        matches_played: number;
        elo_rating: number;
      } | null;
    }
  });

  const stats = React.useMemo(() => {
    const wins = myRanking?.wins ?? 0;
    const losses = myRanking?.losses ?? 0;
    const played = wins + losses;
    return {
      wins,
      losses,
      played,
      elo: myRanking?.elo_rating ?? 1200,
      points: myRanking?.points ?? 0,
      winRate: played > 0 ? Math.round((wins / played) * 100) : 0
    };
  }, [myRanking]);

  const { data: confirmedEvidence = [] } = useQuery({
    queryKey: ['confirmed-evidence-feed'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('match_results')
        .select(
          `
          id,
          match_id,
          reported_by,
          score_player1,
          score_player2,
          screenshot_url,
          created_at,
          reporter:profiles!match_results_reported_by_fkey (
            username,
            avatar_url
          )
        `
        )
        .eq('status', 'confirmed')
        .not('screenshot_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      const signedRows = await Promise.all(
        ((rows || []) as DashboardMatch[]).map(async (row) => {
          let signedUrl = '';

          const evidencePath = getEvidencePath(row.screenshot_url);

          if (evidencePath && !evidencePath.startsWith('http')) {
            const { data: signedData } = await supabase.storage
              .from('evidence')
              .createSignedUrl(evidencePath, 60 * 60);

            signedUrl = signedData?.signedUrl || '';
          } else {
            signedUrl = evidencePath;
          }

          return {
            ...row,
            signedUrl,
            reporter: Array.isArray(row.reporter)
              ? (row.reporter[0] ?? null)
              : (row.reporter ?? null)
          };
        })
      );

      return signedRows as ConfirmedEvidence[];
    }
  });

  /**
   * Recent messages for chats the current user actually participates in.
   *
   * SECURITY: this previously selected the 15 latest chat_messages rows in the
   * whole table, which surfaced other users' private match chats in the
   * notification dropdown. Verified 2026-10-02: a brand-new account could read
   * every existing message. We now resolve the user's match ids first and
   * filter on them, and RLS (migration 0019) enforces the same rule server-side.
   */
  const { data: recentMessages = [] } = useQuery({
    queryKey: ['recent-match-messages', uid],
    enabled: !!uid,
    queryFn: async () => {
      if (!uid) return [];

      const { data: myMatches, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .or(`player1_id.eq.${uid},player2_id.eq.${uid}`);

      if (matchErr) throw matchErr;

      const matchIds = ((myMatches || []) as { id: string }[]).map((m) => m.id);
      if (!matchIds.length) return [];

      const { data: myChats, error: chatErr } = await supabase
        .from('chats')
        .select('id, match_id')
        .eq('scope', 'match')
        .in('match_id', matchIds);

      if (chatErr) throw chatErr;

      const chatIds = ((myChats || []) as { id: string }[]).map((c) => c.id);
      if (!chatIds.length) return [];

      const { data: rows, error } = await supabase
        .from('chat_messages')
        .select(
          `
          id,
          message,
          created_at,
          sender_id,
          chat_id,
          sender:profiles!chat_messages_sender_id_fkey (
            username,
            avatar_url
          )
        `
        )
        .in('chat_id', chatIds)
        .neq('sender_id', uid)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      // Attach the match_id locally (we already know the chat -> match mapping).
      const matchByChat = new Map<string, string>(
        ((myChats || []) as { id: string; match_id: string }[]).map((c) => [c.id, c.match_id])
      );

      return ((rows || []) as DashboardMatch[]).map((row) => {
        const chatMatchId = row.chat_id ? matchByChat.get(row.chat_id) : undefined;
        return {
          ...row,
          sender: Array.isArray(row.sender) ? (row.sender[0] ?? null) : (row.sender ?? null),
          chats: chatMatchId && row.chat_id ? { id: row.chat_id, match_id: chatMatchId } : null
        };
      }) as RecentMessage[];
    }
  });

  // Query already excludes the current user's own messages.
  const unreadOpponentMessages = recentMessages;

  const fetchIncomingDirectChallenges = async (myId: string) => {
    const { data: directMatches, error } = await supabase
      .from('matches')
      .select(
        `
        id,
        player1_id,
        player2_id,
        game_id,
        created_at,
        games (
          name
        ),
        challenger:profiles!matches_player1_id_fkey (
          username,
          avatar_url
        )
      `
      )
      .eq('player2_id', myId)
      .eq('status', 'pending');

    if (error) {
      console.error('Failed to fetch incoming challenges:', error.message);
      return;
    }

    const normalized = ((directMatches || []) as DirectChallenge[]).map((challenge) => ({
      ...challenge,
      challenger: Array.isArray(challenge.challenger)
        ? (challenge.challenger[0] ?? null)
        : (challenge.challenger ?? null),
      games: Array.isArray(challenge.games)
        ? (challenge.games[0] ?? null)
        : (challenge.games ?? null)
    }));

    setIncomingChallenges(normalized);
  };

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: authData }) => {
      const myId = authData.user?.id ?? null;
      setUid(myId);

      if (myId) {
        fetchIncomingDirectChallenges(myId);
      }
    });
  }, []);

  React.useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`dashboard_notifications:${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recent-match-messages', uid] });
          queryClient.invalidateQueries({ queryKey: ['match-result-status'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['upcoming'] });
          fetchIncomingDirectChallenges(uid);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['confirmed-evidence-feed'] });
          queryClient.invalidateQueries({ queryKey: ['upcoming'] });
          queryClient.invalidateQueries({ queryKey: ['match-result-status'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);

  const acceptDirectChallenge = async (matchId: string) => {
    const selectedChallenge = incomingChallenges.find((ch) => ch.id === matchId);
    const challengerName =
      selectedChallenge?.challenger?.username || name(selectedChallenge?.player1_id) || 'Opponent';

    const { error } = await supabase
      .from('matches')
      .update({ status: 'ongoing' })
      .eq('id', matchId)
      .eq('player2_id', uid);

    if (error) {
      notify('Failed to accept challenge. Please try again.', 'error');
      return;
    }

    try {
      await getOrCreateMatchChat(matchId);
    } catch (chatError) {
      console.error('Chat creation/fetch failed:', chatError);
    }

    notify(`Challenge accepted against ${challengerName}. Secure chat is ready.`, 'success');
    queryClient.invalidateQueries({ queryKey: ['upcoming'] });
    queryClient.invalidateQueries({ queryKey: ['recent-match-messages', uid] });

    if (uid) fetchIncomingDirectChallenges(uid);

    nav(`/matches/${matchId}`);
  };

  const declineDirectChallenge = async (matchId: string) => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)
      .eq('player2_id', uid);

    if (!error) {
      notify('Challenge declined and removed from your arena.', 'info');
      if (uid) fetchIncomingDirectChallenges(uid);
    } else {
      notify('Failed to decline challenge.', 'error');
    }
  };

  const ids = [
    ...(data || []).flatMap((m: DashboardMatch) => [m.player1_id, m.player2_id]),
    ...incomingChallenges.map((c) => c.player1_id),
    ...incomingChallenges.map((c) => c.player2_id),
    ...recentMessages.map((m) => m.sender_id),
    ...confirmedEvidence.map((e) => e.reported_by)
  ].filter(Boolean) as string[];

  const { nameMap, avatarMap } = useProfilesMap(ids);

  const name = (pid?: string | null) => (pid ? nameMap.get(pid) || 'Player' : 'TBD');
  const avatar = (pid?: string | null) => (pid ? avatarMap.get(pid) || null : null);

  return (
    <div className="min-h-screen bg-[#03040a] text-gray-100 pb-20 overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(147,51,234,0.14),transparent_30%),linear-gradient(to_bottom,#03040a,#050505)]" />

      <div className="container mx-auto px-4 pt-8 sm:pt-12 lg:pt-16 relative z-0">
        <header className="relative z-50 flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 sm:mb-12">
          <div className="space-y-3 min-w-0">
            <div className="inline-flex items-center gap-2 text-cyan-300 font-black text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 rounded-full">
              <LayoutDashboard size={14} /> Secure Command Center
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
              Arena{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">
                Dashboard
              </span>
            </h1>

            <p className="text-gray-300 font-medium max-w-2xl text-sm sm:text-base">
              Manage fixtures, accept challenges, monitor match chat, and submit verified results
              from one protected arena.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <StatTile
                icon={<ShieldCheck size={14} />}
                label="Win Rate"
                value={`${stats.winRate}%`}
                sub={`${stats.wins}W / ${stats.losses}L`}
                tone="text-emerald-300"
              />
              <StatTile
                icon={<Target size={14} />}
                label="ELO Rating"
                value={String(stats.elo)}
                sub={getRankTitle(stats.elo)}
                tone="text-cyan-300"
              />
              <StatTile
                icon={<Zap size={14} />}
                label="Experience"
                value={String(stats.points)}
                sub={`${stats.played} matches played`}
                tone="text-blue-300"
              />
              <StatTile
                icon={<Radio size={14} />}
                label="In View"
                value={String((data || []).length)}
                sub="active fixtures"
                tone="text-purple-300"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:items-center w-full xl:w-auto">
            <div className="relative z-[9999] w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setNotificationOpen((prev) => !prev)}
                className="relative w-full lg:w-auto flex items-center justify-center gap-2 bg-gray-900/90 hover:bg-gray-800 border border-blue-500/30 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-900/20"
              >
                <Bell size={16} />
                Notifications
                {unreadOpponentMessages.length > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-black shadow-lg">
                    {unreadOpponentMessages.length}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 left-0 lg:left-auto mt-3 w-full lg:w-96 max-h-96 overflow-y-auto rounded-2xl border border-blue-500/30 bg-[#070912] shadow-2xl shadow-black/80 z-[99999]">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-3 bg-blue-950/20">
                    <div>
                      <p className="text-sm font-black uppercase text-white">Match Messages</p>
                      <p className="text-[11px] text-gray-300">Latest secure arena chat activity</p>
                    </div>

                    <MessageCircle size={18} className="text-cyan-300" />
                  </div>

                  {recentMessages.length === 0 ? (
                    <div className="p-5 text-sm text-gray-300 text-center">
                      No recent messages yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {recentMessages.slice(0, 8).map((msg) => (
                        <button
                          key={msg.id}
                          type="button"
                          onClick={() => {
                            setNotificationOpen(false);
                            if (msg.chats?.match_id) {
                              nav(`/matches/${msg.chats.match_id}`);
                            }
                          }}
                          className="w-full text-left p-4 hover:bg-blue-900/20 transition-colors flex gap-3"
                        >
                          <Avatar
                            src={msg.sender?.avatar_url || ''}
                            alt={msg.sender?.username || 'Player'}
                            className="w-9 h-9 border border-blue-500/30 shrink-0"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-3">
                              <p className="text-xs font-black text-gray-100 truncate">
                                {msg.sender_id === uid
                                  ? 'You'
                                  : msg.sender?.username || name(msg.sender_id)}
                              </p>

                              <p className="text-[10px] text-gray-400 shrink-0">
                                {new Date(msg.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>

                            <p className="text-xs text-gray-300 truncate mt-1">{msg.message}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link to="/matches/new" className="w-full lg:w-auto">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20">
                Challenge Player
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <select
                className="w-full sm:min-w-56 bg-gray-950/90 border-2 border-cyan-500/40 text-white font-semibold rounded-xl p-3 outline-none focus:border-cyan-300"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                disabled={gamesLoading}
              >
                <option value="" className="bg-gray-900 text-white">
                  Quick Match Picker
                </option>

                {games?.map((game) => (
                  <option key={game.id} value={game.id} className="bg-gray-900 text-white">
                    {game.name}
                  </option>
                ))}
              </select>

              <Button
                onClick={async () => {
                  try {
                    if (!selectedGame) {
                      notify('Please select a game for Quick Match.', 'error');
                      return;
                    }

                    if (!uid) {
                      notify('Please sign in to start a Quick Match.', 'error');
                      return;
                    }

                    setQuickLoading(true);

                    const { data: rpcRes, error } = await supabase.rpc('claim_quick_match', {
                      p_uid: uid,
                      p_game_id: selectedGame
                    });

                    if (!error && rpcRes) {
                      await getOrCreateMatchChat(rpcRes);
                      notify('Match found! Secure chat is ready.', 'success');
                      nav(`/matches/${rpcRes}`);
                    } else {
                      notify('No open matches. You have joined the queue.', 'info');
                    }
                  } finally {
                    setQuickLoading(false);
                  }
                }}
                disabled={quickLoading || gamesLoading}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-600/20"
              >
                {quickLoading ? 'Searching...' : 'Quick Match'}
              </Button>
            </div>
          </div>
        </header>

        <main className="relative z-10">
          {incomingChallenges.length > 0 && (
            <div className="mb-10 bg-gradient-to-br from-amber-500/15 via-gray-950 to-blue-950/20 border-2 border-amber-400/40 p-4 sm:p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
              <h2 className="text-amber-300 font-black text-xs sm:text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={16} /> Incoming Player Challenges
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {incomingChallenges.map((ch) => {
                  const challengerName =
                    ch.challenger?.username || name(ch.player1_id) || 'Unknown Player';

                  return (
                    <div
                      key={ch.id}
                      className="bg-black/70 border border-amber-400/20 p-4 rounded-2xl flex flex-col gap-4 shadow-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={ch.challenger?.avatar_url || avatar(ch.player1_id) || ''}
                          alt={challengerName}
                          className="w-11 h-11 border border-amber-400/40 shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-300 uppercase truncate">
                            Challenger
                          </p>

                          <p className="text-white font-black truncate">{challengerName}</p>

                          <p className="text-[10px] text-cyan-300 font-black uppercase tracking-wide mt-1 truncate">
                            {ch.games?.name || 'Exhibition Match'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptDirectChallenge(ch.id)}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2 font-black text-xs uppercase"
                        >
                          <Check size={16} /> Accept
                        </button>

                        <button
                          onClick={() => declineDirectChallenge(ch.id)}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2 font-black text-xs uppercase"
                        >
                          <X size={16} /> Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <section className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase italic text-white flex items-center gap-2">
                <Gamepad2 className="text-blue-400" size={22} />
                Upcoming Fixtures
              </h2>
              <p className="text-sm text-gray-300 font-medium">Live and scheduled match activity</p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {isLoading ? (
              [1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-64 bg-gray-900/70 rounded-2xl animate-pulse border border-blue-500/10"
                />
              ))
            ) : data && data.length > 0 ? (
              data.map((m: DashboardMatch) => (
                <MatchCard
                  key={m.match_id}
                  match={m}
                  uid={uid}
                  name={name}
                  avatar={avatar}
                  resultStatus={m.match_id ? resultStatusByMatch.get(m.match_id) : undefined}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </div>

          {confirmedEvidence.length > 0 && (
            <section className="mt-10 rounded-3xl border border-green-500/20 bg-gray-950/80 p-4 sm:p-6 shadow-xl">
              <div className="mb-5">
                <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <ImageIcon size={16} className="text-green-300" />
                  Verified Match Evidence
                </h2>
                <p className="text-gray-300 text-xs mt-1">
                  Confirmed proof uploads from recent arena battles.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {confirmedEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-2xl overflow-hidden border border-white/10 bg-black/70 shadow-lg"
                  >
                    {ev.signedUrl ? (
                      <img
                        src={ev.signedUrl}
                        alt="Match evidence"
                        className="w-full h-48 object-cover bg-gray-900"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-900 flex items-center justify-center text-gray-400 text-xs font-bold uppercase">
                        Evidence unavailable
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={ev.reporter?.avatar_url || avatar(ev.reported_by) || ''}
                          alt={ev.reporter?.username || name(ev.reported_by)}
                          className="w-9 h-9 border border-green-500/30"
                        />

                        <div className="min-w-0">
                          <p className="text-white font-black text-sm truncate">
                            {ev.reporter?.username || name(ev.reported_by)} submitted proof
                          </p>

                          <p className="text-gray-400 text-[10px] font-mono">
                            {new Date(ev.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <p className="text-green-300 font-mono font-black text-xs mt-3">
                        P1: {ev.score_player1} | P2: {ev.score_player2}
                      </p>

                      <Link
                        to={`/matches/${ev.match_id}`}
                        className="inline-block mt-3 text-blue-300 text-xs font-black uppercase hover:underline"
                      >
                        View Match
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 min-w-0 rounded-3xl border border-blue-500/20 bg-gray-950/70 p-4 shadow-xl">
              <div className="mb-4">
                <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Zap size={16} className="text-yellow-300" />
                  Open Challenges
                </h2>
                <p className="text-gray-300 text-xs mt-1">Join available friendly battles.</p>
              </div>
              <OpenChallenges />
            </div>

            <div className="lg:col-span-2 min-w-0 rounded-3xl border border-purple-500/20 bg-gray-950/70 p-4 shadow-xl">
              <div className="mb-4">
                <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-purple-300" />
                  Friendly Match History
                </h2>
                <p className="text-gray-300 text-xs mt-1">
                  Verified friendly records and recent results.
                </p>
              </div>

              <FriendlyHistory uid={uid} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
