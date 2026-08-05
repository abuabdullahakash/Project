import React, { useState } from 'react';
import { ProjectList } from '../projects/ProjectList';
import { KanbanBoard } from '../projects/KanbanBoard';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FolderHeart, Plus, LayoutGrid, List } from 'lucide-react';

interface PersonalDashboardProps {
  onNewProject?: () => void;
}

export function PersonalDashboard({ onNewProject }: PersonalDashboardProps) {
  const { projects } = useProjects();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  // Filter for personal dashboard: projects with projectType === 'personal'
  const personalProjects = projects.filter(p => 
    p.projectType === 'personal' && (p.assignedTo === user?.uid || (!p.assignedTo && p.userId === user?.uid) || p.userId === user?.uid)
  );

  return (
    <div className={`space-y-6 sm:space-y-8 pb-12 sm:pb-20 animate-in fade-in duration-500`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mt-8 sm:mt-0">
        <div>
          <h2 className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>My Personal Workspace</h2>
          <p className={`text-sm mt-1 sm:mt-2 max-w-2xl ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Organize your practice materials, ideas, side-projects, and notes without deadlines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex rounded-lg p-1 border shadow-xs ${
            theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'list' 
                  ? theme === 'dark' ? 'bg-[#1e293b] text-blue-400 shadow-sm' : 'bg-slate-100 text-blue-600 shadow-sm' 
                  : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md flex items-center justify-center transition-all ${
                viewMode === 'kanban' 
                  ? theme === 'dark' ? 'bg-[#1e293b] text-blue-400 shadow-sm' : 'bg-slate-100 text-blue-600 shadow-sm' 
                  : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutGrid size={18} strokeWidth={2.5} />
            </button>
          </div>
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="bg-purple-600 text-white hover:bg-purple-500 px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-sm shadow-purple-500/20"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">New Personal Project</span>
            </button>
          )}
        </div>
      </div>

      {personalProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'
          }`}>
            <FolderHeart size={32} className="text-purple-500" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No personal projects found</h3>
          <p className={`max-w-md ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            You haven't added any personal projects yet. They're a great way to track your learning, practice work, and creative ideas without strict deadlines.
          </p>
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="mt-6 text-purple-600 font-medium hover:underline text-sm"
            >
              Add your first personal project
            </button>
          )}
        </div>
      ) : (
        viewMode === 'list' ? (
          <ProjectList 
            projects={personalProjects} 
            activeTab="all"
            filterStage="All"
            filterPriority="All"
            sortBy="Recently Updated"
            onlyOverdue={false}
            selectedMonth="All"
            selectedYear="All"
          />
        ) : (
          <KanbanBoard 
            projects={personalProjects}
            activeTab="all"
            filterStage="All"
            filterPriority="All"
            sortBy="Recently Updated"
            onlyOverdue={false}
            selectedMonth="All"
            selectedYear="All"
          />
        )
      )}
    </div>
  );
}
