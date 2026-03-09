import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, SectionTitle } from '../components/ui';

export function SubmitResult() {
  const { matchId } = useParams<{ matchId: string }>();
  const nav = useNavigate();
  const [score1, setScore1] = React.useState(0);
  const [score2, setScore2] = React.useState(0);
  const [file, setFile] = React.useState<File | null>(null); // Added file state
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setErr('Please upload evidence'); return; }
    setErr(null); setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr('Not authenticated'); setLoading(false); return; }

    // 1. Upload file to 'evidence' bucket
    // Note: ensure the 'evidence' bucket exists in your Supabase storage
    const filePath = `${matchId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from('evidence')
      .upload(filePath, file);
    
    if (uploadErr) { setErr(uploadErr.message); setLoading(false); return; }

    // 2. Save file path to DB
    const { error } = await supabase.from('match_results').insert({
      match_id: matchId,
      reported_by: user.id,
      score_player1: score1,
      score_player2: score2,
      screenshot_url: filePath, // Storing the path for future signed URL generation
      status: 'pending'
    });

    setLoading(false);
    if (error) { setErr(error.message); } else { nav(-1); }
  }

  return (
    <div className="container max-w-md py-6">
      <SectionTitle>Submit Result</SectionTitle>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Score Player 1</label>
            <Input type="number" min={0} value={score1} onChange={e=>setScore1(parseInt(e.target.value || '0', 10))} />
          </div>
          <div>
            <label className="label">Score Player 2</label>
            <Input type="number" min={0} value={score2} onChange={e=>setScore2(parseInt(e.target.value || '0', 10))} />
          </div>
          <div>
            <label className="label">Evidence (Screenshot/Video)</label>
            {/* Added file input to capture the user's upload */}
            <input 
              type="file" 
              accept="image/*,video/*" 
              onChange={e => setFile(e.target.files?.[0] || null)} 
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Result'}</Button>
        </form>
      </Card>
    </div>
  );
}