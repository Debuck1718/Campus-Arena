import React from 'react';
import { supabase } from '../supabaseClient';
import { uploadMatchEvidence } from '../lib/storage';
import { Button, Card } from './ui';
import { AlertTriangle, ShieldAlert, UploadCloud, X, Gavel } from 'lucide-react';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'score_mismatch', label: 'Wrong Score Reported' },
  { value: 'invalid_screenshot', label: 'Evidence Does Not Match' },
  { value: 'cheating', label: 'Cheating / Misconduct' },
  { value: 'no_show', label: 'Opponent No-Show' },
  { value: 'other', label: 'Other' }
];

interface RaiseDisputeDialogProps {
  matchId: string;
  /** Pre-fills the category when launched from a specific context. */
  defaultCategory?: string;
  onClose: () => void;
  onFiled?: () => void;
}

/**
 * Lets either match participant contest a result — including one that was
 * already approved — so an admin can un-approve the evidence and re-review it.
 * Calls the `raise_match_dispute` RPC (migration 0021), which freezes the match,
 * reopens the contested evidence, and locks the message box.
 */
export function RaiseDisputeDialog({
  matchId,
  defaultCategory,
  onClose,
  onFiled
}: RaiseDisputeDialogProps) {
  const [category, setCategory] = React.useState(defaultCategory || 'score_mismatch');
  const [description, setDescription] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required to file a dispute.');

      const uploadedPaths: string[] = [];
      for (const file of files) {
        const path = await uploadMatchEvidence(file, matchId);
        if (path) uploadedPaths.push(path);
      }

      const { error: rpcError } = await supabase.rpc('raise_match_dispute', {
        p_match_id: matchId,
        p_category: category,
        p_description: description || null,
        p_evidence_urls: uploadedPaths.length ? uploadedPaths : null
      });
      if (rpcError) throw rpcError;

      setDone(true);
      onFiled?.();
    } catch (err: unknown) {
      console.error('Raise dispute failed:', err);
      setError(err instanceof Error ? err.message : 'Could not file the dispute.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="bg-[#0a0a0c] border-gray-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Gavel size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest">
              {done ? 'Dispute Filed' : 'Contest This Result'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto text-amber-400">
              <ShieldAlert size={30} />
            </div>
            <p className="text-xs text-gray-400 font-bold leading-relaxed">
              Your dispute is under review. The approved evidence has been reopened and
              administrators will re-examine it. You&apos;ll be notified when a ruling is issued.
            </p>
            <Button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500 py-4 font-black uppercase tracking-widest text-xs rounded-xl"
            >
              Understood
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
              If the approved result is wrong, raise a dispute. An admin will un-approve the
              evidence and review the match again. The match is frozen until a ruling is made.
            </p>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                Reason
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs font-black uppercase outline-none focus:border-blue-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#0a0a0c]">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                What went wrong?
              </label>
              <textarea
                className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-sm font-bold min-h-[120px] focus:border-blue-600 outline-none transition-all placeholder:text-gray-700"
                placeholder="Describe the discrepancy with the reported result..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                Additional Evidence (optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {files.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-[10px] font-bold text-blue-400 uppercase"
                  >
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <label className="border-2 border-dashed border-gray-800 rounded-lg px-4 py-2 flex items-center gap-2 cursor-pointer hover:border-blue-600 transition-colors text-[10px] font-black uppercase text-gray-500">
                  <UploadCloud size={14} /> Add File
                  <input type="file" multiple className="hidden" onChange={handleFiles} />
                </label>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-800 hover:bg-gray-700 py-4 font-black uppercase tracking-widest text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-500 py-4 font-black uppercase tracking-widest text-xs rounded-xl"
              >
                {loading ? 'Filing...' : 'File Dispute'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
