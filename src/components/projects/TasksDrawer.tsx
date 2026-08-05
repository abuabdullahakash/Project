import React, { useState } from 'react';
import { Project, ProjectTask } from '../../types';
import { X, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTheme } from '../../context/ThemeContext';

interface TasksDrawerProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
}

export function TasksDrawer({ project, isOpen, onClose, onUpdateProject }: TasksDrawerProps) {
  const { theme } = useTheme();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  useBodyScrollLock(isOpen);

  if (!isOpen || !project) return null;

  const tasks = project.tasks || [];

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: ProjectTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    onUpdateProject(project.id, {
      tasks: [...tasks, newTask]
    });

    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateProject(project.id, { tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    onUpdateProject(project.id, { tasks: updatedTasks });
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && project && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative w-full sm:max-w-md h-full shadow-2xl flex flex-col border-l ${
              theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`px-4 sm:px-6 py-3 sm:py-3.5 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <div className="flex-1 min-w-0 pr-4">
                <h2 className={`text-sm sm:text-base font-semibold tracking-tight truncate ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`} title={project.title}>
                  Tasks for {project.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex-1 h-1 rounded-full overflow-hidden ${
                    theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'
                  }`}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                  }`}>
                    {completedCount}/{tasks.length}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className={`p-1.5 rounded-lg transition-all shrink-0 ${
                theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}>
                <X size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin ${
              theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
            }`}>
              <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all ${
                    theme === 'dark'
                      ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95"
                >
                  <Plus size={18} />
                </button>
              </form>

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${
                    theme === 'dark' ? 'border-white/5 text-gray-500' : 'border-slate-200 text-slate-400 bg-slate-50'
                  }`}>
                    <p className="text-sm font-medium">No tasks yet.</p>
                    <p className="text-[10px] uppercase tracking-wider mt-1">Add your first task above</p>
                  </div>
                ) : (
                  [...tasks].sort((a, b) => {
                    if (a.completed === b.completed) {
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    }
                    return a.completed ? 1 : -1;
                  }).map(task => (
                    <motion.div
                      layout
                      key={task.id}
                      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        task.completed
                          ? theme === 'dark' ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-slate-50/50 border-slate-100 opacity-60'
                          : theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`shrink-0 transition-colors ${
                          task.completed ? 'text-blue-500' : theme === 'dark' ? 'text-gray-600 hover:text-gray-400' : 'text-slate-300 hover:text-slate-400'
                        }`}
                      >
                        {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <span className={`flex-1 text-xs sm:text-sm transition-all ${
                        task.completed 
                          ? 'line-through text-gray-500' 
                          : theme === 'dark' ? 'text-gray-200' : 'text-slate-700'
                      }`}>
                        {task.title}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                          theme === 'dark' ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
