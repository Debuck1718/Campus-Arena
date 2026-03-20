import React from 'react';
import { supabase } from '../supabaseClient';
import { SEO } from '../components/SEO';
import { Button, Card, Input } from '../components/ui';
import { 
  LifeBuoy, 
  Gavel, 
  AlertTriangle, 
  Send, 
  ShieldAlert, 
  CheckCircle2,
  UploadCloud,
  Hash,
  X
} from 'lucide-react';

export function Support() {
  const [category, setCategory] = React.useState('Match Dispute');
  const [description, setDescription] = React.useState('');
  const [matchId, setMatchId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);

  // Simple handler for multiple file selection UI
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // Note: In a real flow, you'd upload files to Supabase Storage first 
      // and get the resulting URLs for the evidence_urls array.
      const mockUrls: string[] = files.map(f => `evidence/${user.id}/${f.name}`);

      const { error } = await supabase.from('disputes').insert({
        match_id: matchId || null,
        raised_by: user.id,
        category,
        description,
        evidence_urls: mockUrls,
        status: 'pending' // Default status
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      console.error("Dispute Submission Failed:", err.message);
      alert("Submission failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <Card className="bg-[#0a0a0c] border-blue-600/30 p-12 rounded-[3rem] text-center max-w-md shadow-2xl shadow-blue-600/10">
          <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2">Case Filed</h2>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-8">Dispute #{Math.random().toString(36).substring(7).toUpperCase()} is now under review.</p>
          <Button onClick={() => setSubmitted(false)} className="w-full bg-blue-600 hover:bg-blue-500 py-6 font-black uppercase tracking-widest rounded-2xl">
            Return to Arena
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 pb-20 relative overflow-hidden">
      <SEO title="Dispute Center • CampusArena" description="File a formal match dispute." />
      
      <div className="container max-w-5xl mx-auto px-4 pt-16 relative z-10">
        
        <header className="mb-12 border-b border-white/5 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
              <ShieldAlert size={24} />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Dispute Center</h1>
          </div>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Integrity & Fair Play Oversight</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* --- INFO PANEL --- */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Filing Instructions</h3>
            <div className="space-y-4">
              <Step icon={<Hash size={14}/>} title="Reference Match" text="Ensure the Match ID is accurate for faster resolution." />
              <Step icon={<UploadCloud size={14}/>} title="Clear Evidence" text="Upload full-screen captures showing final scores." />
              <Step icon={<Gavel size={14}/>} title="Final Decision" text="Admins review all intel before issuing a ruling." />
            </div>
          </div>

          {/* --- DISPUTE FORM --- */}
          <div className="lg:col-span-8">
            <Card className="bg-[#0a0a0c] border-gray-800 p-8 rounded-[2.5rem] shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Match ID</label>
                    <Input 
                      placeholder="e.g. 550e8400-e29b..."
                      value={matchId}
                      onChange={(e) => setMatchId(e.target.value)}
                      className="bg-black border-gray-800 font-mono text-xs uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs font-black uppercase outline-none focus:border-blue-600"
                    >
                      <option>Match Dispute</option>
                      <option>Player Harassment</option>
                      <option>Account Issues</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Incident Description</label>
                  <textarea 
                    className="w-full bg-black border border-gray-800 rounded-2xl p-5 text-sm font-bold min-h-[160px] focus:border-blue-600 outline-none transition-all placeholder:text-gray-700"
                    placeholder="Describe exactly what happened during or after the match..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Evidence Multi-Upload UI */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">Combat Intel (Evidence)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative group bg-gray-900 border border-gray-800 p-3 rounded-xl flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase truncate max-w-[80px] text-blue-400">{file.name}</span>
                        <button type="button" onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <label className="border-2 border-dashed border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 transition-colors group min-h-[80px]">
                      <UploadCloud size={20} className="text-gray-600 group-hover:text-blue-500 mb-1" />
                      <span className="text-[9px] font-black uppercase text-gray-600">Add File</span>
                      <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                </div>

                <Button 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-7 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Transmitting...' : <><Send size={18} /> File Formal Dispute</>}
                </Button>
              </form>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

function Step({ icon, title, text }: any) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
      <div className="mt-1 text-blue-500">{icon}</div>
      <div>
        <h4 className="text-[11px] font-black uppercase italic text-gray-200">{title}</h4>
        <p className="text-[10px] text-gray-500 font-bold leading-tight mt-1">{text}</p>
      </div>
    </div>
  );
}