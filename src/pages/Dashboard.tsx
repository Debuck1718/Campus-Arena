import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useProfilesMap } from '../hooks/useProfilesMap';
import { Link } from 'react-router-dom';
import { Card, SectionTitle, Avatar } from '../components/ui';
import soccerImg from '../images/Soccer.png';

// Define the interface for the MatchCard props
interface MatchCardProps {
  match: any;
  uid: string | null;
  name: (pid?: string | null) => string;
  avatar: (pid?: string | null) => string | null;
}

async function fetchUpcoming() {
  const { data, error } = await supabase
    .from('v_user_upcoming_matches')
    .select('*')
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data;
}

const SkeletonMatchCard = () => (
  <div className="border rounded-lg p-5 animate-pulse space-y-4 shadow-sm bg-white">
    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    <div className="flex justify-between items-center py-4">
      <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
      <div className="h-4 w-8 bg-gray-200 rounded"></div>
      <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

const MatchCard: React.FC<MatchCardProps> = ({ match, uid, name, avatar }) => {
  const involved = uid && (uid === match.player1_id || uid === match.player2_id);

  return (
    // Note: If Card doesn't accept className, remove it or wrap in a div
    <Card>
      <div className="flex flex-col gap-3 p-5 border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{match.tournament_name}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${match.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
            {match.status}
          </span>
        </div>
        
        <div className="flex items-center justify-between py-2">
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
             {/* If Avatar component doesn't take className, style it via a wrapper */}
             <div className="w-12 h-12"><Avatar src={avatar(match.player1_id) || ''} alt={name(match.player1_id)} /></div>
            <span className="text-xs font-medium truncate w-full text-center">{name(match.player1_id)}</span>
          </div>
          <span className="text-gray-300 font-black px-2">VS</span>
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-12 h-12"><Avatar src={avatar(match.player2_id) || ''} alt={name(match.player2_id)} /></div>
            <span className="text-xs font-medium truncate w-full text-center">{name(match.player2_id)}</span>
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100">
          <Link to={`/tournaments/${match.tournament_id}/match/${match.match_id}`} className="text-xs font-semibold text-blue-600 hover:underline">Details</Link>
          {involved && match.status !== 'completed' && (
            <Link to={`/tournaments/${match.tournament_id}/submit/${match.match_id}`} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700">Submit</Link>
          )}
        </div>
      </div>
    </Card>
  );
};

export function Dashboard() {
  const [uid, setUid] = React.useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['upcoming'], queryFn: fetchUpcoming });

  React.useEffect(() => { 
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); 
  }, []);

  const ids = (data || []).flatMap((m: any) => [m.player1_id, m.player2_id]).filter(Boolean) as string[];
  const { nameMap, avatarMap } = useProfilesMap(ids);
  const name = (pid?: string | null) => (pid ? (nameMap.get(pid) || pid) : 'TBD');
  const avatar = (pid?: string | null) => (pid ? (avatarMap.get(pid) || null) : null);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <img src={soccerImg} alt="Soccer" className="h-8" /> Upcoming Matches
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading 
          ? [1, 2, 3].map((n) => <SkeletonMatchCard key={n} />)
          : data?.map((m: any) => (
            <MatchCard key={m.match_id} match={m} uid={uid} name={name} avatar={avatar} />
          ))
        }
      </div>
    </div>
  );
}