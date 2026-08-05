import React, { useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { GlobalNotesDrawer } from './GlobalNotesDrawer';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  onNewProject: () => void;
}

export function Header({ onNewProject }: HeaderProps) {
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <header className={`h-14 border-b flex items-center px-6 justify-between ${
        theme === 'dark' ? 'bg-[#020617] border-white/10' : 'bg-white border-slate-200'
      }`}>
        <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
          Overview
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsNotesOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm border ${
              theme === 'dark' ? 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Global Notes & Links"
          >
            <BookOpen size={16} />
            Notes
          </button>
          <button 
            onClick={onNewProject}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm ${
              theme === 'dark' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </header>

      <GlobalNotesDrawer 
        isOpen={isNotesOpen} 
        onClose={() => setIsNotesOpen(false)} 
      />
    </>
  );
}
