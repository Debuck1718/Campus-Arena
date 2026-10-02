import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, SectionTitle } from '../components/ui';
import { uploadMatchEvidence } from '../lib/storage';
import { Upload, Trophy, AlertCircle } from 'lucide-react';

export function SubmitResult() {
  const { matchId } = useParams<{ matchId: string }>();
  const nav = useNavigate();
  
  // State accepts number or empty string to allow seamless input clearing
  const [score1, setScore1] = React.useState<number | ''>(0);
  const [score2, setScore2] = React.useState<number | ''>(0);
  const [tiebreak1, setTiebreak1] = React.useState<number | ''>('');
  const [tiebreak2, setTiebreak2] = React.useState<number | ''>('');
  const [isKnockout, setIsKnockout] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    supabase
      .from('matches')
      .select('stage')
      .eq('id', matchId)
      .maybeSingle()
      .then(({ data }) => setIsKnockout(data?.stage === 'knockout'));
  }, [matchId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErr('Evidence is required to verify the match.');
      return;
    }

    setErr(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErr('Authentication required to submit.');
      setLoading(false);
      return;
    }

    const filePath = await uploadMatchEvidence(file, matchId!);
    if (!filePath) {
      setErr('Upload failed. Please try again.');
      setLoading(false);
      return;
    }

    // Default blank values to 0 right before database insertion
    const finalScore1 = score1 === '' ? 0 : score1;
    const finalScore2 = score2 === '' ? 0 : score2;
    const isTie = finalScore1 === finalScore2;

    // Knockout draws are decided by separate, unequal tiebreak scores (migration 0020).
    const finalTiebreak1 = tiebreak1 === '' ? null : tiebreak1;
    const finalTiebreak2 = tiebreak2 === '' ? null : tiebreak2;
    if (isTie && isKnockout) {
      if (finalTiebreak1 === null || finalTiebreak2 === null) {
        setErr('A tied knockout result requires tiebreak scores for both players.');
        setLoading(false);
        return;
      }
      if (finalTiebreak1 === finalTiebreak2) {
        setErr('Tiebreak scores must not be equal — one player must win the tiebreak.');
        setLoading(false);
        return;
      }
    }

    // 1. Insert into match_results
    const { error: resultError } = await supabase.from('match_results').insert({
      match_id: matchId,
      reported_by: user.id,
      score_player1: finalScore1,
      score_player2: finalScore2,
      tiebreak_score_player1: finalTiebreak1,
      tiebreak_score_player2: finalTiebreak2,
      screenshot_url: filePath,
      status: 'pending',
    });

    if (resultError) {
      setErr('Database error: ' + resultError.message);
      setLoading(false);
      return;
    }

    // The match status transition is handled server-side by triggers on
    // match_results (migration 0020 blocks direct client updates to matches).
    setLoading(false);
    nav(-1);
  }

  // Tiebreak inputs appear when the submitted regulation score is a draw.
  const scoresTied = score1 !== '' && score2 !== '' && score1 === score2;
  const isTieVisible = scoresTied;

  const handleScoreChange = (value: string, setScore: React.Dispatch<React.SetStateAction<number | ''>>) => {
    if (value === '') {
      setScore('');
    } else {
      const parsed = parseInt(value, 10);
      setScore(isNaN(parsed) ? 0 : parsed);
    }
  };

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
              <Input
                type="number"
                min={0}
                value={score1}
                onChange={(e) => handleScoreChange(e.target.value, setScore1)}
                className="bg-black border-gray-700 text-lg"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Player 2 Score</label>
              <Input
                type="number"
                min={0}
                value={score2}
                onChange={(e) => handleScoreChange(e.target.value, setScore2)}
                className="bg-black border-gray-700 text-lg"
                placeholder="0"
              />
            </div>
          </div>

          {(isTieVisible) && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-amber-700/40 bg-amber-900/10 p-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Tiebreak Scores {isKnockout ? '(required — decides the winner)' : '(optional)'}
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Player 1 Tiebreak</label>
                <Input
                  type="number"
                  min={0}
                  value={tiebreak1}
                  onChange={(e) => handleScoreChange(e.target.value, setTiebreak1)}
                  className="bg-black border-gray-700 text-lg"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Player 2 Tiebreak</label>
                <Input
                  type="number"
                  min={0}
                  value={tiebreak2}
                  onChange={(e) => handleScoreChange(e.target.value, setTiebreak2)}
                  className="bg-black border-gray-700 text-lg"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Upload Evidence</label>
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
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