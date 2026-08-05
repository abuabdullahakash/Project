import React, { useState } from 'react';
import { ArrowLeft, Settings, Save, Check, Share2, Copy } from 'lucide-react';
import { usePortfolio } from '../../../context/PortfolioContext';

export function AdminBar({ onExit }: { onExit: () => void }) {
  const { isEditMode, saveChanges, portfolioId } = usePortfolio();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isEditMode) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await saveChanges();
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleShare = () => {
    if (portfolioId) {
      const url = new URL(window.location.href);
      url.search = `?id=${portfolioId}`;
      navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[100] flex flex-col gap-3 items-end">
      <div className="bg-slate-900 text-white shadow-2xl rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-2 border border-slate-700/50 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl w-full sm:w-auto justify-center">
          <Settings size={16} className="text-blue-400 animate-spin-slow" />
          <span className="text-sm font-medium tracking-wide">Live Editor Active</span>
        </div>
        
        {portfolioId && (
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white"
          >
            {copied ? (
              <><Check size={16} className="text-green-400" /> Copied Link!</>
            ) : (
              <><Share2 size={16} /> Share Public Link</>
            )}
          </button>
        )}

        <button 
          onClick={handleSave}
          disabled={isSaving || saved}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium w-full sm:w-auto ${
            saved 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {saved ? (
            <><Check size={16} /> Saved!</>
          ) : isSaving ? (
            <><Settings size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Changes</>
          )}
        </button>
        <button 
          onClick={onExit} 
          className="flex items-center justify-center gap-2 hover:bg-red-500/20 hover:text-red-400 px-4 py-2 rounded-xl transition-all text-sm font-medium group w-full sm:w-auto"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Exit Editor
        </button>
      </div>
    </div>
  );
}
