import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card, SectionTitle, Avatar, Button } from '../components/ui';

interface ProfileData {
  username: string;
  platform: string[];
  avatar_url: string;
  bio?: string;
}

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function getProfile() {
      if (!id) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('username, platform, avatar_url, bio')
        .eq('id', id)
        .single();

      if (error) {
        setErr("Profile not found");
      } else {
        setProfile(data);
      }
      setLoading(false);
    }
    getProfile();
  }, [id]);

  if (loading) return <div className="container py-10 text-center text-gray-500">Loading profile...</div>;
  if (err || !profile) return <div className="container py-10 text-center text-red-600">{err || "Error loading profile"}</div>;

  return (
    <div className="container max-w-2xl py-10 mx-auto">
      <Card className="overflow-hidden">
        {/* Profile Header Background */}
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        
        <div className="px-6 pb-6">
          <div className="relative -mt-12 flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <Avatar 
              src={profile.avatar_url} 
              alt={profile.username} 
              size={100} 
            />
            <div className="mt-4 text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{profile.username}</h1>
              <p className="text-gray-500">Competitor</p>
            </div>
            <div className="mt-4 sm:mt-0">
              
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Bio Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">About</h3>
              <p className="text-gray-700 leading-relaxed">
                {profile.bio || `${profile.username} hasn't added a bio yet.`}
              </p>
            </div>

            {/* Platforms Section */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Active Platforms</h3>
              <div className="flex flex-wrap gap-2">
                {profile.platform && profile.platform.length > 0 ? (
                  profile.platform.map((p) => (
                    <span 
                      key={p} 
                      className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200"
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 italic">No platforms listed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}