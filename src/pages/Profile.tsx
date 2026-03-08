import React from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, Select, SectionTitle, Avatar } from '../components/ui';
import { uploadAvatar } from '../lib/storage';

export function Profile() {
  const [username, setUsername] = React.useState('');
  const [platform, setPlatform] = React.useState<string>('');
  const [avatarUrl, setAvatarUrl] = React.useState<string>('');
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [uid, setUid] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const id = sess.user?.id || null;
      setUid(id);
      if (!id) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (data) {
        setUsername(data.username || '');
        setPlatform(data.platform || '');
        setAvatarUrl(data.avatar_url || '');
      }
    })();
  }, []);

  async function save() {
    setMsg(null);
    if (!uid) return;
    const { error } = await supabase.from('profiles').update({
      username,
      platform: platform || null,
      avatar_url: avatarUrl || null
    }).eq('id', uid);
    if (error) setMsg(error.message);
    else setMsg('Saved');
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !uid) return;
    if (!f.type.startsWith('image/')) { setMsg('Please upload an image'); return; }
    setUploading(true);
    try {
      const url = await uploadAvatar(f, uid);
      setAvatarUrl(url);
      setMsg('Avatar uploaded (remember to Save)');
    } catch (err: any) {
      setMsg(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container max-w-lg py-6">
      <SectionTitle>Profile</SectionTitle>
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl} alt={username || 'You'} size={64} />
            <div>
              <label className="label">Change avatar (optional)</label>
              <input type="file" accept="image/*" onChange={onFileChange} />
              {uploading && <div className="text-xs text-gray-500 mt-1">Uploading...</div>}
            </div>
          </div>
          <div>
            <label className="label">Username</label>
            <Input value={username} onChange={e=>setUsername(e.target.value)} />
          </div>
          <div>
            <label className="label">Platform</label>
            <Select value={platform} onChange={e=>setPlatform(e.target.value)}>
              <option value="">Select platform</option>
              <option>PlayStation</option>
              <option>Xbox</option>
              <option>PC</option>
              <option>Mobile</option>
            </Select>
          </div>
          <Button onClick={save}>Save</Button>
          {msg && <div className="text-sm text-green-600">{msg}</div>}
        </div>
      </Card>
    </div>
  );
}