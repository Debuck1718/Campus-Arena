import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, SectionTitle } from '../components/ui';
import { uploadMatchEvidence } from '../lib/storage';
import { Upload, Trophy, AlertCircle } from 'lucide-react';

export function SubmitResult() {
  const { matchId } = useParams<{ matchId: string }>();
  const nav = useNavigate();
  
  // FIX: Allow state to hold an empty string when user clears the input field
  const [score1, setScore1] = React.useState<number | ''>(0);
  const [score2, setScore2] = React.useState<number | ''>(0);
  const [file, setFile] = React.useState<File | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

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

    // FIX: Default empty values to 0 right before saving payload to Postgres
    const finalScore1 = score1 === '' ? 0 : score1;
    const finalScore2 = score2 === '' ? 0 : score2;

    const { error } = await supabase.from('match_results').insert({
      match_id: matchId,
      reported_by: user.id,
      score_player1: finalScore1,
      score_player2: finalScore2,
      screenshot_url: filePath,
      status: 'pending',
    });

    setLoading(false);
    if (error) {
      setErr('Database error: ' + error.message);
    } else {
      nav(-1);
    }
  }

  // FIX: Handle parsing state dynamically to allow users to completely clear fields
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
                // FIX: Custom parser lets backspace work normally
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
                // FIX: Custom parser lets backspace work normally
                onChange={(e) => handleScoreChange(e.target.value, setScore2)}
                className="bg-black border-gray-700 text-lg"
                placeholder="0"
              />
            </div>
          </div>

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