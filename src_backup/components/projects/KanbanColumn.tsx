import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Project, Stage } from '../../types';
import { SortableProjectCard } from './SortableProjectCard';
import { useTheme } from '../../context/ThemeContext';

interface KanbanColumnProps {
  key?: string | number;
  stage: Stage;
  projects: Project[];
  onEdit: (project: Project) => void;
  onNotes: (project: Project) => void;
  onTasks: (project: Project) => void;
  onLinks: (project: Project) => void;
  onEmail: (project: Project) => void;
  onUpdate: (project: Project, updates: Partial<Project>) => void;
  onDelete: (project: Project) => void;
  onTouch: (project: Project) => void;
}

export function KanbanColumn({ stage, projects, onEdit, onNotes, onTasks, onLinks, onEmail, onUpdate, onDelete, onTouch }: KanbanColumnProps) {
  const { theme } = useTheme();
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case 'First Stage': 
        return theme === 'dark' 
          ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' 
          : 'text-blue-600 border-blue-200 bg-blue-50';
      case 'Middle Stage': 
        return theme === 'dark' 
          ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' 
          : 'text-purple-600 border-purple-200 bg-purple-50';
      case 'Final Stage': 
        return theme === 'dark' 
          ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' 
          : 'text-amber-600 border-amber-200 bg-amber-50';
      case 'Delivered': 
        return theme === 'dark' 
          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
          : 'text-emerald-600 border-emerald-200 bg-emerald-50';
      default: 
        return theme === 'dark' 
          ? 'text-gray-400 border-gray-500/30 bg-gray-500/10' 
          : 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] sm:min-w-[320px] w-[280px] sm:w-[320px] max-w-[280px] sm:max-w-[320px] rounded-2xl border backdrop-blur-sm snap-center transition-all ${
        theme === 'dark' 
          ? `border-white/5 bg-white/[0.02] ${isOver ? 'bg-white/[0.05] border-white/20' : ''}` 
          : `border-slate-200 bg-slate-50/50 ${isOver ? 'bg-slate-100 border-slate-300 shadow-md' : 'shadow-sm'}`
      }`}
    >
      <div className={`p-4 border-b flex items-center justify-between rounded-t-2xl ${
        theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getStageColor(stage)}`}>
            {stage}
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            theme === 'dark' ? 'text-gray-400 bg-white/5' : 'text-slate-500 bg-slate-100'
          }`}>
            {projects.length}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto min-h-[150px] space-y-4">
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map(project => (
            <SortableProjectCard
              key={project.id}
              project={project}
              onEdit={onEdit}
              onNotes={onNotes}
              onTasks={onTasks}
              onLinks={onLinks}
              onEmail={onEmail}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onTouch={onTouch}
            />
          ))}
        </SortableContext>
        
        {projects.length === 0 && (
          <div className={`h-full flex items-center justify-center text-sm italic border-2 border-dashed rounded-xl py-8 ${
            theme === 'dark' ? 'text-gray-500 border-white/5' : 'text-slate-400 border-slate-200 bg-slate-50'
          }`}>
            Drop projects here
          </div>
        )}
      </div>
    </div>
  );
}
