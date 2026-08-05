import React, { useState, useRef, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Project, UserProfile } from '../../types';
import { getRemainingTime, formatRelativeTime } from '../../utils/dateUtils';
import { Clock, MessageSquare, Edit2, Trash2, CheckSquare, ChevronUp, ChevronDown, Minus, CheckCircle2, AlertTriangle, ExternalLink, Star, Link as LinkIcon, Mail, User, Key } from 'lucide-react';

interface ProjectCardProps {
  key?: string | number;
  project: Project;
  onTouch: () => void;
  onUpdate: (updates: Partial<Project>) => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenNotes: () => void;
  onOpenTasks: () => void;
  onOpenLinks: () => void;
  onOpenEmail: () => void;
  isKanban?: boolean;
}

import { useTheme } from '../../context/ThemeContext';

export function ProjectCard({ project, onTouch, onUpdate, onEdit, onDelete, onOpenNotes, onOpenTasks, onOpenLinks, onOpenEmail, isKanban = false }: ProjectCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignedUser, setAssignedUser] = useState<UserProfile | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchAssignedUser = async () => {
      if (project.assignedTo && db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', project.assignedTo));
          if (userDoc.exists()) {
            setAssignedUser(userDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching assigned user:", error);
        }
      } else {
        setAssignedUser(null);
      }
    };
    fetchAssignedUser();
  }, [project.assignedTo]);
  
  const timeInfo = getRemainingTime(project.endDate);
  const isDelivered = project.status === 'Delivered';
  const isActive = !isDelivered;
  
  // Check if it was overdue when delivered or if it is currently overdue
  const wasOverdueAtDelivery = isDelivered && project.deliveredAt && new Date(project.deliveredAt) > new Date(project.endDate);
  const showOverdue = (isActive && timeInfo.isOverdue) || wasOverdueAtDelivery;

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Active': return 'text-blue-500';
      case 'Revision': return 'text-yellow-500';
      case 'Delivered': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const handleMarkDelivered = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ 
      status: 'Delivered', 
      deliveredAt: new Date().toISOString(), 
      stage: 'Delivered' 
    });
    setShowConfirm(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteConfirm(false);
  };

  const getPriorityIcon = (priority: Project['priority']) => {
    switch (priority) {
      case 'High': return <ChevronUp size={16} className="text-red-500" />;
      case 'Medium': return <ChevronUp size={16} className="text-yellow-500" />;
      case 'Low': return <ChevronDown size={16} className="text-blue-500" />;
      default: return <Minus size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative backdrop-blur-sm ${
      theme === 'dark' ? 'bg-white/[0.02]' : 'bg-white shadow-sm'
    } ${
      project.status === 'Active' ? 'border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/10' :
      project.status === 'Delivered' ? 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/10' :
      'border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/10'
    }`}>
      {showOverdue && (
        <div className={`text-center py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] border-b backdrop-blur-sm relative z-10 ${
          theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {isDelivered ? `Delivered Overdue (${Math.ceil((new Date(project.deliveredAt!).getTime() - new Date(project.endDate).getTime()) / (1000 * 60 * 60 * 24))}d)` : `Overdue by ${timeInfo.days} days`}
        </div>
      )}
      {isActive && !timeInfo.isOverdue && (
        <div className={`text-center py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] border-b backdrop-blur-sm relative z-10 ${
          timeInfo.days <= 3 
            ? theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-red-50 text-red-500 border-red-100 animate-pulse'
            : theme === 'dark' ? 'bg-white/5 text-gray-300 border-white/10' : 'bg-slate-50 text-slate-500 border-slate-100'
        }`}>
          Remaining: {timeInfo.days}d {timeInfo.hours}h
        </div>
      )}
      {isDelivered && (
        <div className={`text-center py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] border-b backdrop-blur-sm relative z-10 ${
          theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
        }`}>
          Delivered: {new Date(project.deliveredAt!).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
        </div>
      )}
      
      <div className={`${isKanban ? 'p-4' : 'p-7'} flex-1 flex flex-col relative z-10`}>
        <div className={`flex justify-between items-start ${isKanban ? 'mb-4' : 'mb-6'} gap-4`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className={`font-medium ${isKanban ? 'text-base' : 'text-xl'} leading-tight truncate transition-colors tracking-tight ${
                theme === 'dark' ? 'text-white group-hover:text-gray-300' : 'text-slate-900 group-hover:text-slate-700'
              }`}>
                {project.title}
              </h3>
              {project.websiteLink && !isKanban && (
                <a 
                  href={project.websiteLink.startsWith('http') ? project.websiteLink : `https://${project.websiteLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full transition-all shrink-0 border ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-white/10 bg-white/5 border-white/5' 
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100 bg-slate-50 border-slate-100'
                  }`}
                  title="Visit Website"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            <p className={`truncate font-medium ${isKanban ? 'text-xs' : 'text-sm'} ${
              theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
            }`}>{project.clientName}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className={`font-light tracking-tight ${isKanban ? 'text-lg' : 'text-2xl'} ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>${project.price || 0}</span>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(project.status).replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}></div>
              {isDelivered ? (
                <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em]">Delivered</span>
              ) : (
                <select 
                  value={project.status || 'Active'}
                  onChange={(e) => onUpdate({ status: e.target.value as Project['status'] })}
                  className={`bg-transparent border-none p-0 text-[10px] font-bold uppercase tracking-[0.2em] focus:ring-0 cursor-pointer ${getStatusColor(project.status)}`}
                >
                  <option value="Active" className={theme === 'dark' ? 'bg-[#020617] text-gray-300' : 'bg-white text-slate-600'}>Active</option>
                  <option value="Revision" className={theme === 'dark' ? 'bg-[#020617] text-gray-300' : 'bg-white text-slate-600'}>Revision</option>
                </select>
              )}
            </div>
            {assignedUser && (
              <div className={`flex items-center gap-1.5 mt-2 text-[10px] font-medium px-2 py-1 rounded-md border ${
                theme === 'dark' 
                  ? 'text-gray-400 bg-white/5 border-white/5' 
                  : 'text-slate-500 bg-slate-50 border-slate-100'
              }`} title="Assigned To">
                <User size={10} />
                <span className="truncate max-w-[100px]">{assignedUser.displayName || assignedUser.email}</span>
              </div>
            )}
          </div>
        </div>

        {!isKanban && (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <select
                value={project.stage || 'First Stage'}
                disabled={isDelivered}
                onChange={(e) => onUpdate({ stage: e.target.value as Project['stage'] })}
                className={`flex-1 border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 disabled:opacity-50 transition-all appearance-none ${
                  theme === 'dark' 
                    ? 'bg-black/50 border-white/10 text-gray-200 focus:border-white/30 focus:ring-white/30' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                <option value="First Stage" className={theme === 'dark' ? 'bg-[#020617]' : 'bg-white'}>First Stage</option>
                <option value="Middle Stage" className={theme === 'dark' ? 'bg-[#020617]' : 'bg-white'}>Middle Stage</option>
                <option value="Final Stage" className={theme === 'dark' ? 'bg-[#020617]' : 'bg-white'}>Final Stage</option>
                <option value="Delivered" className={theme === 'dark' ? 'bg-[#020617]' : 'bg-white'}>Delivered</option>
              </select>

              {!isDelivered && !showConfirm && (
                <div className="relative group/btn flex items-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                    className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-lg border ${
                    theme === 'dark' ? 'bg-gray-900 text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'
                  }`}>
                    Mark as Delivered
                  </div>
                </div>
              )}
            </div>

          {isDelivered && (
            <div className={`mt-4 flex items-center gap-3 border rounded-xl px-4 py-3.5 ${
              theme === 'dark' ? 'bg-black/50 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Client Rating:</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={project.clientRating || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 5) {
                    onUpdate({ clientRating: val });
                  } else if (e.target.value === '') {
                    onUpdate({ clientRating: undefined });
                  }
                }}
                className={`w-16 border rounded-lg px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 transition-all text-center ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-white focus:border-white/30 focus:ring-white/30' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="0.0"
              />
              <div className="flex items-center gap-1.5 ml-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const rating = project.clientRating || 0;
                  const fillPercentage = Math.max(0, Math.min(100, (rating - star + 1) * 100));
                  
                  return (
                    <div key={star} className="relative w-4 h-4">
                      <Star size={16} className={`${theme === 'dark' ? 'text-white/10' : 'text-slate-200'} absolute inset-0`} />
                      <div 
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${fillPercentage}%` }}
                      >
                        <Star size={16} className="text-amber-400" fill="currentColor" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showConfirm && (
            <div className={`mt-4 border rounded-xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md ${
              theme === 'dark' ? 'bg-black/80 border-white/10' : 'bg-white border-slate-200'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Mark as Delivered?</p>
              <div className="flex gap-3">
                <button 
                  onClick={handleMarkDelivered}
                  className="flex-1 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Yes
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
        )}

          {showDeleteConfirm && (
            <div className={`mt-4 border rounded-xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md ${
              theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Delete Project?</p>
              <div className="flex gap-3">
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                >
                  Delete
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        <div className={`mt-auto pt-6 border-t flex flex-col gap-5 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-lg border uppercase tracking-[0.15em] ${
              theme === 'dark' ? 'text-gray-400 bg-white/5 border-white/5' : 'text-slate-500 bg-slate-50 border-slate-100'
            }`}>
              {getPriorityIcon(project.priority)}
              <span>{project.priority}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] ${
              theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
            }`}>
              <Clock size={12} />
              <span>{formatRelativeTime(project.lastUpdatedAt)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button 
                onClick={onOpenNotes} 
                className={`p-2 sm:p-2.5 rounded-full transition-all relative group/btn ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Notes"
              >
                <MessageSquare size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                {(project.notes?.length || 0) > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[8px] sm:text-[9px] font-bold rounded-full flex items-center justify-center border-2 shadow-sm ${
                    theme === 'dark' ? 'bg-white text-black border-[#050505]' : 'bg-slate-900 text-white border-white'
                  }`}>
                    {project.notes?.length}
                  </span>
                )}
              </button>

              {/* Tasks button hidden temporarily as per user request */}
              {/* 
              <button 
                onClick={onOpenTasks} 
                className={`p-2 sm:p-2.5 rounded-full transition-all relative group/btn ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Tasks"
              >
                <CheckSquare size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                {project.tasks?.length > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[8px] sm:text-[9px] font-bold rounded-full flex items-center justify-center border-2 shadow-sm ${
                    theme === 'dark' ? 'bg-blue-500 text-white border-[#050505]' : 'bg-blue-600 text-white border-white'
                  }`}>
                    {project.tasks.length}
                  </span>
                )}
              </button>
              */}
              
              <button 
                onClick={onOpenLinks}
                className={`p-2 sm:p-2.5 rounded-full transition-all relative group/btn ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Project Resources"
              >
                <LinkIcon size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                {((project.additionalLinks?.length || 0) + (project.credentials?.length || 0)) > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[8px] sm:text-[9px] font-bold rounded-full flex items-center justify-center border-2 shadow-sm ${
                    theme === 'dark' ? 'bg-white text-black border-[#050505]' : 'bg-slate-900 text-white border-white'
                  }`}>
                    {(project.additionalLinks?.length || 0) + (project.credentials?.length || 0)}
                  </span>
                )}
              </button>

              <button 
                onClick={onOpenEmail}
                className={`p-2 sm:p-2.5 rounded-full transition-all group/btn ${
                  theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="Send Email"
              >
                <Mail size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
              </button>
              
              {!isDelivered && (
                <>
                  <button 
                    onClick={onEdit} 
                    className={`p-2 sm:p-2.5 rounded-full transition-all group/btn ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Edit"
                  >
                    <Edit2 size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} 
                    className={`p-2 sm:p-2.5 rounded-full transition-all group/btn ${
                      theme === 'dark' ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10' : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Delete"
                  >
                    <Trash2 size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                  </button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isDelivered ? (
                <button 
                  onClick={() => onUpdate({ status: 'Revision' })}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full hover:bg-amber-500/20 hover:border-amber-500/30 transition-all text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em]"
                >
                  <AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5" />
                  Revision
                </button>
              ) : (
                <button 
                  onClick={(e) => { e.preventDefault(); onTouch(); }}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                >
                  <CheckSquare size={12} className="sm:w-3.5 sm:h-3.5" />
                  Update
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
