import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Project, UserProfile } from '../../types';
import { getRemainingTime, formatRelativeTime } from '../../utils/dateUtils';
import { Clock, MessageSquare, Edit2, Trash2, CheckSquare, ChevronUp, ChevronDown, Minus, CheckCircle2, AlertTriangle, ExternalLink, Star, Link as LinkIcon, Mail, User, Key, Image as ImageIcon, Loader2, Check, Send, X } from 'lucide-react';
import { useNotifierSettings, ProjectChat } from '../../hooks/useNotifierSettings';

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
  onOpenMedia?: () => void;
  isKanban?: boolean;
}

import { useTheme } from '../../context/ThemeContext';

export function ProjectCard({ project, onTouch, onUpdate, onEdit, onDelete, onOpenNotes, onOpenTasks, onOpenLinks, onOpenEmail, onOpenMedia, isKanban = false }: ProjectCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTargetSelect, setShowTargetSelect] = useState(false);
  const [customMsg, setCustomMsg] = useState({ title: '', clientName: '', stage: '', priority: '', footer: '' });
  const [assignedUser, setAssignedUser] = useState<UserProfile | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [selectedChats, setSelectedChats] = useState<{global: boolean, specific: boolean, projects: string[]}>({global: true, specific: true, projects: []});
  const { theme } = useTheme();
  const { settings, loading: settingsLoading } = useNotifierSettings();

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
  const wasOverdueAtDelivery = isDelivered && project.deliveredAt && !!project.endDate && new Date(project.deliveredAt) > new Date(project.endDate);
  const showOverdue = !!project.endDate && ((isActive && timeInfo.isOverdue) || wasOverdueAtDelivery);

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

  const handleUpdateClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    if (updateStatus !== 'idle') return;

    if ((settings && settings.enabled && settings.projectChats.length > 0) || project.telegramChatId) {
      setShowTargetSelect(true);
    } else {
      handleSendUpdateToChats(true, true, []);
    }
  };

  const handleSendUpdateToChats = async (sendToGlobal: boolean, sendToSpecific: boolean, projectChatIds: string[]) => {
    setShowTargetSelect(false);
    setUpdateStatus('sending');
    onTouch(); 
    
    const tpl = settings?.templateConfig || {
      header: '🚀 <b>Project Updated</b>',
      defaultTitle: '',
      defaultClient: '',
      defaultStage: '',
      defaultPriority: '',
      footerText: ''
    };

    // Determine final values: Use customMsg if provided, else tpl Default, else fallback to project data
    const finalTitle = customMsg.title.trim() || tpl.defaultTitle || project.title || 'N/A';
    const finalClient = customMsg.clientName.trim() || tpl.defaultClient || project.clientName || 'N/A';
    const finalStage = customMsg.stage.trim() || tpl.defaultStage || project.stage || 'N/A';
    const finalPriority = customMsg.priority.trim() || tpl.defaultPriority || project.priority || 'N/A';
    const finalFooter = customMsg.footer.trim();

    let message = `${tpl.header || '🚀 <b>Project Updated</b>'}\n\n`;
    message += `<b>Title:</b> ${finalTitle}\n`;
    if (!isPersonalProject) message += `<b>Client:</b> ${finalClient}\n`;
    message += `<b>Stage:</b> ${finalStage}\n`;
    message += `<b>Priority:</b> ${finalPriority}\n`;

    if (finalFooter) {
      message += `\n${finalFooter}`;
    } else if (tpl.footerText) {
      message += `\n${tpl.footerText}`;
    }
    
    try {
      const mod = await import('../../services/telegramService');
      let success = false;
      
      const promises = [];
      
      if (sendToGlobal && (!settings || settings.enabled)) {
         promises.push(mod.sendTelegramNotification(message, settings?.globalBotToken, settings?.globalChatId));
      }

      if (sendToSpecific && project.telegramChatId) {
         promises.push(mod.sendTelegramNotification(message, settings?.globalBotToken, project.telegramChatId));
      }
      
      if (settings?.enabled) {
        for (const chatId of projectChatIds) {
           const chatConfig = settings.projectChats.find(c => c.id === chatId);
           if (chatConfig && chatConfig.chatId) {
              promises.push(mod.sendTelegramNotification(message, settings.globalBotToken, chatConfig.chatId));
           }
        }
      }
      
      const results = await Promise.all(promises);
      success = results.some(r => r === true);
      
      if (success) {
        setUpdateStatus('success');
        setTimeout(() => setUpdateStatus('idle'), 1500);
      } else {
        setUpdateStatus('idle');
      }
    } catch (error) {
      console.error('Failed to send update notifications', error);
      setUpdateStatus('idle');
    }
  };

  const handleCardClick = () => {
    if (isDelivered) {
      window.history.pushState({}, '', `/project/${project.id}`);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const isPersonalProject = project.projectType === 'personal';

  return (
    <div 
      onClick={isDelivered ? handleCardClick : undefined}
      className={`rounded-2xl sm:rounded-3xl border overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative backdrop-blur-sm outline-none ${
        isDelivered ? 'cursor-pointer ring-0 hover:ring-2 hover:ring-emerald-500/50' : ''
      } ${
        theme === 'dark' ? 'bg-white/[0.02]' : 'bg-white shadow-sm'
      } ${
        project.status === 'Active' ? 'border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/10' :
        project.status === 'Delivered' ? 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/10' :
        'border-amber-500/20 hover:border-amber-500/40 hover:shadow-amber-500/10'
      }`}>
      {showOverdue && !isPersonalProject && (
        <div className={`text-center py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] border-b backdrop-blur-sm relative z-10 ${
          theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'
        }`}>
          {isDelivered ? `Delivered Overdue (${Math.ceil((new Date(project.deliveredAt!).getTime() - new Date(project.endDate!).getTime()) / (1000 * 60 * 60 * 24))}d)` : `Overdue by ${timeInfo.days} days`}
        </div>
      )}
      {isActive && !timeInfo.isOverdue && !isPersonalProject && project.endDate && (
        <div className={`text-center py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] border-b backdrop-blur-sm relative z-10 ${
          timeInfo.days <= 3 
            ? theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-red-50 text-red-500 border-red-100 animate-pulse'
            : theme === 'dark' ? 'bg-white/5 text-gray-300 border-white/10' : 'bg-slate-50 text-slate-500 border-slate-100'
        }`}>
          Remaining: {timeInfo.days}d {timeInfo.hours}h
        </div>
      )}
      {isDelivered && !isPersonalProject && project.deliveredAt && (
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
            {!isPersonalProject && (
              <p className={`truncate font-medium ${isKanban ? 'text-xs' : 'text-sm'} ${
                theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
              }`}>{project.clientName}</p>
            )}
            {isPersonalProject && (
              <p className={`font-medium text-[10px] uppercase tracking-wider py-0.5 px-2 rounded-full inline-block ${
                theme === 'dark' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-100'
              } border`}>Personal / Practice</p>
            )}
          </div>
          <div className="flex flex-col items-end shrink-0">
            {!isPersonalProject && (
              <span className={`font-light tracking-tight ${isKanban ? 'text-lg' : 'text-2xl'} ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>${project.price || 0}</span>
            )}
            <div className={`flex items-center gap-2 ${isPersonalProject ? '' : 'mt-1.5'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(project.status).replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}></div>
              {isDelivered ? (
                <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em]">Delivered</span>
              ) : (
                <select 
                  value={project.status || 'Active'}
                  onChange={(e) => onUpdate({ status: e.target.value as Project['status'] })}
                  className={`bg-transparent border-none p-0 text-[10px] font-bold uppercase tracking-[0.2em] focus:ring-0 cursor-pointer ${getStatusColor(project.status)}`}
                >
                  <option value="Active" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-300' : 'bg-white text-slate-600'}>Active</option>
                  <option value="Revision" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-300' : 'bg-white text-slate-600'}>Revision</option>
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

        {!isKanban && !isPersonalProject && (
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
                onClick={(e) => e.stopPropagation()}
              >
                <option value="First Stage" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>First Stage</option>
                <option value="Middle Stage" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Middle Stage</option>
                <option value="Final Stage" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Final Stage</option>
                <option value="Delivered" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Delivered</option>
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
                onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpenNotes(); }} 
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
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpenTasks(); }} 
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
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpenLinks(); }}
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

              {!isDelivered && (
                <button 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpenEmail(); }}
                  className={`p-2 sm:p-2.5 rounded-full transition-all group/btn ${
                    theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title="Send Email"
                >
                  <Mail size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                </button>
              )}

              {isDelivered && onOpenMedia && (
                <button 
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onOpenMedia(); }}
                  className={`p-2 sm:p-2.5 rounded-full transition-all group/btn ${
                    project.reviewScreenshotUrl || (project.projectGalleryUrls && project.projectGalleryUrls.length > 0) || project.liveDemoUrl
                      ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' 
                      : theme === 'dark' ? 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title="Manage Media & Links"
                >
                  <ImageIcon size={14} className="sm:w-4 sm:h-4 group-hover/btn:scale-110 transition-transform" />
                </button>
              )}
              
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
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
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isDelivered ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdate({ status: 'Revision' }); }}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full hover:bg-amber-500/20 hover:border-amber-500/30 transition-all text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em]"
                >
                  <AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5" />
                  Revision
                </button>
              ) : (
                <button 
                  onClick={handleUpdateClick}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-white rounded-full transition-all duration-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] min-w-[100px] sm:min-w-[120px] ${
                    updateStatus === 'success'
                      ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      : updateStatus === 'sending'
                      ? 'bg-blue-500/80 cursor-wait'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.8)] hover:scale-105 active:scale-95 relative overflow-hidden group'
                  }`}
                >
                  {updateStatus === 'idle' && (
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500 will-change-transform" />
                  )}
                  {updateStatus === 'sending' ? (
                    <>
                      <Loader2 size={12} className="sm:w-3.5 sm:h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : updateStatus === 'success' ? (
                    <>
                      <Check size={12} className="sm:w-3.5 sm:h-3.5 animate-[ping_0.3s_ease-out_forwards]" />
                      Notified!
                    </>
                  ) : (
                    <>
                      <CheckSquare size={12} className="sm:w-3.5 sm:h-3.5 relative z-10" />
                      <span className="relative z-10">Update</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTargetSelect && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 cursor-default animate-in fade-in"
          onClick={(e) => { e.stopPropagation(); setShowTargetSelect(false); }}
        >
          <div 
            className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col pt-1 ${
              theme === 'dark' ? 'bg-[#0f172a] border border-white/10' : 'bg-white border border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Send Project Update</h3>
              <button 
                onClick={() => setShowTargetSelect(false)}
                className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Message Override Section */}
              <div className="space-y-3">
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Message Overrides</h4>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customMsg.title}
                    onChange={e => setCustomMsg(p => ({ ...p, title: e.target.value }))}
                    placeholder={`Title: ${project.title}`}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none transition-all ${
                      theme === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                  {!isPersonalProject && (
                    <input
                      type="text"
                      value={customMsg.clientName}
                      onChange={e => setCustomMsg(p => ({ ...p, clientName: e.target.value }))}
                      placeholder={`Client: ${project.clientName}`}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none transition-all ${
                        theme === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                      }`}
                    />
                  )}
                  <input
                    type="text"
                    value={customMsg.stage}
                    onChange={e => setCustomMsg(p => ({ ...p, stage: e.target.value }))}
                    placeholder={`Stage: ${project.stage}`}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none transition-all ${
                      theme === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                  <input
                    type="text"
                    value={customMsg.priority}
                    onChange={e => setCustomMsg(p => ({ ...p, priority: e.target.value }))}
                    placeholder={`Priority: ${project.priority}`}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none transition-all ${
                      theme === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                  <textarea
                    value={customMsg.footer}
                    onChange={e => setCustomMsg(p => ({ ...p, footer: e.target.value }))}
                    placeholder="Optional message note..."
                    rows={2}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none transition-all resize-y ${
                      theme === 'dark' ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {/* Target Selection */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10">
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Select Targets</h4>
                
                {settings?.globalChatId && (
                  <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedChats.global}
                      onChange={(e) => setSelectedChats(prev => ({...prev, global: e.target.checked}))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Global Update Group</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Main notification channel</p>
                    </div>
                  </label>
                )}
              {project.telegramChatId && (
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedChats.specific}
                    onChange={(e) => setSelectedChats(prev => ({...prev, specific: e.target.checked}))}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" 
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>This Project's Chat</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Specific to this project</p>
                  </div>
                </label>
              )}
              {settings?.projectChats.map(chat => (
                <label key={chat.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedChats.projects.includes(chat.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedChats(prev => ({...prev, projects: [...prev.projects, chat.id]}));
                      } else {
                        setSelectedChats(prev => ({...prev, projects: prev.projects.filter(id => id !== chat.id)}));
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" 
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{chat.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Project specific channel</p>
                  </div>
                </label>
              ))}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendUpdateToChats(selectedChats.global, selectedChats.specific, selectedChats.projects);
                }}
                disabled={!selectedChats.global && !selectedChats.specific && selectedChats.projects.length === 0}
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Send size={16} /> Send Update
              </button>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}
    </div>
  );
}
