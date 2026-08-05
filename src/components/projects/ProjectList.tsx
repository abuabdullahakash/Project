import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useProjects } from '../../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { calculateRemainingDays } from '../../utils/dateUtils';
import { ProjectFormModal } from './ProjectFormModal';
import { NotesDrawer } from './NotesDrawer';
import { TasksDrawer } from './TasksDrawer';
import { ProjectLinksModal } from './ProjectLinksModal';
import { EmailModal } from './EmailModal';
import { ProjectMediaModal } from './ProjectMediaModal';
import { Project } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface ProjectListProps {
  projects: Project[];
  activeTab: 'running' | 'delivered' | 'revision' | 'all';
  filterStage: string;
  filterPriority: string;
  sortBy: string;
  onlyOverdue: boolean;
  selectedMonth: string;
  selectedYear: string;
  defaultTeamId?: string;
}

export function ProjectList({ projects, activeTab, filterStage, filterPriority, sortBy, onlyOverdue, selectedMonth, selectedYear, defaultTeamId }: ProjectListProps) {
  const { touchProject, updateProject, deleteProject } = useProjects();
  const { theme } = useTheme();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [notesProject, setNotesProject] = useState<Project | null>(null);
  const [tasksProject, setTasksProject] = useState<Project | null>(null);
  const [linksProject, setLinksProject] = useState<Project | null>(null);
  const [emailProject, setEmailProject] = useState<Project | null>(null);
  const [mediaProject, setMediaProject] = useState<Project | null>(null);

  let filteredProjects = projects.filter(p => {
    if (activeTab === 'running') {
      if (p.status !== 'Active' && p.status !== 'Revision') return false;
    } else if (activeTab === 'delivered') {
      if (p.status !== 'Delivered') return false;
      
      const monthMatch = selectedMonth === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getMonth() === parseInt(selectedMonth));
      const yearMatch = selectedYear === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getFullYear() === parseInt(selectedYear));
      
      if (!monthMatch || !yearMatch) {
        return false;
      }
    } else if (activeTab === 'revision') {
      if (p.status !== 'Revision') return false;
    }

    if (activeTab === 'delivered') {
      // For delivered tab, we only care about the stage if it's "Delivered" or "All"
      if (filterStage !== 'All' && filterStage !== 'Delivered') return false;
    } else {
      if (filterStage !== 'All' && p.stage !== filterStage && activeTab !== 'all') return false;
    }
    
    if (filterPriority !== 'All' && p.priority !== filterPriority && activeTab !== 'all') return false;
    if (onlyOverdue && activeTab !== 'delivered' && activeTab !== 'all') {
      if (calculateRemainingDays(p.endDate) >= 0) return false;
    }
    return true;
  });

  filteredProjects.sort((a, b) => {
    if (sortBy === 'Nearest Deadline') {
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    }
    if (sortBy === 'Highest Priority') {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    if (sortBy === 'Recently Updated') {
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
    }
    return 0;
  });

  if (filteredProjects.length === 0) {
    return (
      <div className={`text-center py-24 rounded-3xl border shadow-sm backdrop-blur-sm ${
        theme === 'dark' ? 'bg-white/[0.02] border-white/5 text-gray-500' : 'bg-white border-slate-200 text-slate-400'
      }`}>
        <p className="text-sm font-medium tracking-wide">No projects found.</p>
      </div>
    );
  }

  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const status = project.status || 'Active';
    if (!acc[status]) acc[status] = [];
    acc[status].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  const statusOrder: Project['status'][] = ['Active', 'Revision', 'Delivered'];

  return (
    <div className="space-y-12">
      {statusOrder.map(status => {
        const projectsInStatus = groupedProjects[status];
        if (!projectsInStatus || projectsInStatus.length === 0) return null;

        return (
          <div key={status} className="space-y-6">
            <div className={`flex items-center justify-between px-2 border-b pb-4 ${
              theme === 'dark' ? 'border-white/5' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'Active' ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]' : 
                  status === 'Revision' ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : 
                  status === 'Delivered' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-gray-500'
                }`} />
                <h3 className={`text-xs font-bold uppercase tracking-[0.25em] ${
                  theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                }`}>
                  {status}
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border tracking-[0.1em] uppercase ${
                theme === 'dark' ? 'bg-white/5 text-gray-400 border-white/5' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {projectsInStatus.length} {projectsInStatus.length === 1 ? 'Project' : 'Projects'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {projectsInStatus.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  >
                    <ProjectCard 
                      project={project} 
                      onTouch={() => touchProject(project.id)} 
                      onUpdate={(updates) => updateProject(project.id, updates)}
                      onEdit={() => setEditingProject(project)}
                      onDelete={() => deleteProject(project.id)}
                      onOpenNotes={() => setNotesProject(project)}
                      onOpenTasks={() => setTasksProject(project)}
                      onOpenLinks={() => setLinksProject(project)}
                      onOpenEmail={() => setEmailProject(project)}
                      onOpenMedia={() => setMediaProject(project)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      <ProjectFormModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        initialData={editingProject}
        defaultTeamId={defaultTeamId}
        onSubmit={(updates) => {
          if (editingProject) {
            updateProject(editingProject.id, updates);
          }
        }}
      />

      {notesProject && (
        <NotesDrawer
          isOpen={!!notesProject}
          onClose={() => setNotesProject(null)}
          project={notesProject}
          onUpdateProject={(id, updates) => {
            updateProject(id, updates);
            setNotesProject(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}

      {tasksProject && (
        <TasksDrawer
          isOpen={!!tasksProject}
          onClose={() => setTasksProject(null)}
          project={tasksProject}
          onUpdateProject={(id, updates) => {
            updateProject(id, updates);
            setTasksProject(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}

      <ProjectLinksModal
        isOpen={!!linksProject}
        onClose={() => setLinksProject(null)}
        project={linksProject}
        onUpdateProject={(id, updates) => {
          updateProject(id, updates);
          setLinksProject(prev => prev ? { ...prev, ...updates } : null);
        }}
      />

      <EmailModal
        project={emailProject}
        isOpen={!!emailProject}
        onClose={() => setEmailProject(null)}
      />

      {mediaProject && (
        <ProjectMediaModal
          project={mediaProject}
          onClose={() => setMediaProject(null)}
          onUpdate={(updates) => {
            updateProject(mediaProject.id, updates);
            setMediaProject(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}
    </div>
  );
}
