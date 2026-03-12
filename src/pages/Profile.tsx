import React from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, SectionTitle, Avatar } from '../components/ui';
import { uploadAvatar } from '../lib/storage';

export function Profile() {
  const [username, setUsername] = React.useState('');
  // Updated to string array to support multiple platform choices
  const [platforms, setPlatforms] = React.useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);

  const availablePlatforms = ['PlayStation', 'Xbox', 'PC', 'Mobile'];

  React.useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const id = sess.user?.id || null;
      setUid(id);
      if (!id) return;

      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) {
        setUsername(data.username || '');
        // Ensure data.platform is handled as an array
        setPlatforms(Array.isArray(data.platform) ? data.platform : []);
        setAvatarUrl(data.avatar_url || '');
      }
    })();
  }, []);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((i) => i !== p) : [...prev, p]));
  };

  async function save() {
    setMsg(null);
    if (!uid) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        platform: platforms, // Saving the array of strings
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', uid);

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !uid) return;
    if (!f.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'Please upload a valid image file' });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadAvatar(f, uid);
      setAvatarUrl(url);
      setMsg({ type: 'success', text: 'Avatar uploaded! Click Save to apply changes.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container max-w-lg py-10 mx-auto">
      <SectionTitle>Profile Settings</SectionTitle>

      <Card>
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="border-2 border-gray-100 shadow-sm rounded-full inline-block">
              <Avatar src={avatarUrl} alt={username} size={80} />
            </div>
            <div className="flex-1">
              <label htmlFor="avatar-upload" className="label text-sm font-semibold">
                Profile Picture
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && (
                <p className="text-xs text-blue-500 mt-2 animate-pulse">Processing image...</p>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="label font-semibold">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your gaming handle"
              />
            </div>

            <div>
              <label className="label font-semibold mb-2 block">Gaming Platforms</label>
              <div className="grid grid-cols-2 gap-3">
                {availablePlatforms.map((p) => (
                  <label
                    key={p}
                    className={`flex items-center space-x-2 border p-3 rounded-lg cursor-pointer transition-colors ${platforms.includes(p) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={platforms.includes(p)}
                      onChange={() => togglePlatform(p)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Action & Feedback */}
          <div className="pt-4 space-y-4">
            <Button onClick={save} className="w-full py-3 text-lg font-bold">
              Save Changes
            </Button>

            {msg && (
              <div
                className={`p-3 rounded-md text-sm text-center ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
