import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, SectionTitle } from '../components/ui';

export function SubmitResult() {
  const { matchId } = useParams<{ matchId: string }>();
  const nav = useNavigate();
  const [score1, setScore1] = React.useState(0);
  const [score2, setScore2] = React.useState(0);
  const [screenshotUrl, setScreenshotUrl] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id;
    if (!uid) { setErr('Not authenticated'); setLoading(false); return; }
    const { error } = await supabase.from('match_results').insert({
      match_id: matchId,
      reported_by: uid,
      score_player1: score1,
      score_player2: score2,
      screenshot_url: screenshotUrl,
      status: 'confirmed'
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    nav(-1);
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
            <label className="label">Screenshot URL</label>
            <Input value={screenshotUrl} onChange={e=>setScreenshotUrl(e.target.value)} placeholder="https://... (signed URL)" />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</Button>
        </form>
      </Card>
    </div>
  );
}