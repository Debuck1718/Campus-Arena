import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, SectionTitle } from '../components/ui';
import { Upload, Trophy, AlertCircle } from 'lucide-react';
export function SubmitResult() {
  const { matchId } = useParams<{ matchId: string }>();
  const nav = useNavigate();
  const [score1, setScore1] = React.useState<number>(0);
  const [score2, setScore2] = React.useState<number>(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setErr('Evidence is required to verify the match.'); return; }
    setErr(null); setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr('Authentication required to submit.'); setLoading(false); return; }

    const filePath = `${matchId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('evidence').upload(filePath, file);
    
    if (uploadErr) { setErr('Upload failed. Please try again.'); setLoading(false); return; }

    const { error } = await supabase.from('match_results').insert({
      match_id: matchId,
      reported_by: user.id,
      score_player1: score1,
      score_player2: score2,
      screenshot_url: filePath,
      status: 'pending'
    });

    setLoading(false);
    if (error) { setErr('Database error: ' + error.message); } else { nav(-1); }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <SectionTitle className="text-2xl font-bold tracking-tight">Report Outcome</SectionTitle>
        <p className="text-gray-400">Enter the final score and attach proof.</p>
      </div>
      
      <Card className="bg-gray-900 border-gray-800 p-6 shadow-2xl">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Player 1 Score</label>
              <Input type="number" min={0} value={score1} onChange={e=>setScore1(parseInt(e.target.value || '0', 10))} className="bg-black border-gray-700 text-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Player 2 Score</label>
              <Input type="number" min={0} value={score2} onChange={e=>setScore2(parseInt(e.target.value || '0', 10))} className="bg-black border-gray-700 text-lg" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upload Evidence</label>
            <div className="relative group cursor-pointer">
              <input 
                type="file" 
                accept="image/*,video/*" 
                onChange={e => setFile(e.target.files?.[0] || null)} 
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800 hover:border-blue-500 transition-all text-sm">
                <Upload size={20} className="text-blue-400" />
                {file ? <span className="text-white truncate">{file.name}</span> : <span className="text-gray-400">Tap to attach screenshot/video</span>}
              </label>
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 p-3 rounded">
              <AlertCircle size={16} /> {err}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : <><Trophy size={18} /> Submit Results</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;

    async function getUrl() {
      const { data, error } = await supabase.storage
        .from('evidence')
        .createSignedUrl(path as string, 3600); // URL expires in 1 hour

      if (error) {
        console.error('Error fetching signed URL:', error);
      } else {
        setUrl(data.signedUrl);
      }
    }

    getUrl();
  }, [path]);

  return url;
}