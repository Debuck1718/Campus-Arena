import React from 'react';
import { SEO } from '../components/SEO';
import { 
  Lock, 
  Database, 
  EyeOff, 
  Trash2, 
  ShieldCheck, 
  HardDrive,
  Key,
  Info
} from 'lucide-react';

export function Privacy(): JSX.Element {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 pb-20 relative overflow-hidden">
      <SEO 
        title="Privacy Protocol • CampusArena" 
        description="Data encryption and privacy standards for the CampusArena ecosystem." 
      />
      
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-green-500/5 blur-[120px] pointer-events-none" />

      <div className="container max-w-4xl mx-auto px-4 pt-16 relative z-10">
        
        {/* Header Section */}
        <header className="mb-16 border-l-4 border-green-500 pl-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
              <Lock size={24} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Privacy Protocol</h1>
          </div>
          <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-4">Secure Data Handling • v1.2.0</p>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            At CampusArena, your data is treated as critical intel. We employ industry-standard encryption to ensure your gaming identity and match history remain secure.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-12">
          
          {/* Data Collection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataCard 
              icon={<Database size={20} />}
              title="Identity Data"
              description="Usernames, platform IDs (PSN, Xbox Live), and career stats are stored in secured Supabase clusters."
            />
            <DataCard 
              icon={<HardDrive size={20} />}
              title="Media Assets"
              description="Avatars and match evidence are hosted in encrypted storage buckets, accessible only via temporary Signed URLs."
            />
          </div>

          {/* Detailed Policy Sections */}
          <div className="space-y-12">
            
            <section>
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <EyeOff size={16} className="text-green-500" /> Information Usage
              </h3>
              <div className="bg-[#0a0a0c] border border-gray-800 p-8 rounded-3xl space-y-4 leading-relaxed text-sm">
                <p>
                  We utilize your data specifically for <strong>matchmaking integrity</strong> and <strong>global ranking calculations</strong>. 
                  We do not sell your personal information to third-party advertisers. Your match history is public to ensure 
                  transparency in our competitive ecosystem.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Key size={16} className="text-green-500" /> Security Standards
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['JWT Authentication', 'Row Level Security', 'SSL Encryption'].map((tech) => (
                  <div key={tech} className="bg-black/40 border border-gray-900 p-4 rounded-xl flex items-center gap-3">
                    <ShieldCheck size={14} className="text-green-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">{tech}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Trash2 size={16} className="text-red-500" /> The Right to be Forgotten
              </h3>
              <div className="p-6 border border-red-900/20 bg-red-900/5 rounded-2xl">
                <p className="text-sm text-gray-400 mb-4">
                  Users maintain full control over their data. You may request a complete purge of your account, match history, and uploaded media at any time.
                </p>
                <button className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-2">
                  <Info size={12} /> Contact Data Protection Officer
                </button>
              </div>
            </section>

          </div>

          {/* Footer Metadata */}
          <footer className="mt-12 pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
              Last Tactical Update: {lastUpdated}
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-[10px] font-black uppercase text-gray-500 hover:text-green-500">Cookie Protocol</a>
              <a href="#" className="text-[10px] font-black uppercase text-gray-500 hover:text-green-500">Sub-Processors</a>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}

// Internal Helper Component
function DataCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-[#0a0a0c] border border-gray-800 p-6 rounded-3xl hover:border-green-500/30 transition-all group">
      <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-white font-black uppercase italic tracking-tight mb-2">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed font-bold uppercase tracking-tighter">{description}</p>
    </div>
  );
}