import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Project, Priority, Stage, Status, UserProfile, Team } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

import { useTheme } from '../../context/ThemeContext';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'id' | 'createdAt' | 'lastUpdatedAt' | 'notes'>) => void;
  initialData?: Project | null;
  defaultTeamId?: string;
}

export function ProjectFormModal({ isOpen, onClose, onSubmit, initialData, defaultTeamId }: ProjectFormModalProps) {
  const { theme } = useTheme();
  const { userProfile, isAdmin } = useAuth();
  
  useBodyScrollLock(isOpen);
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<'client' | 'personal'>('client');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [stage, setStage] = useState<Stage>('First Stage');
  const [status, setStatus] = useState<Status>('Active');
  const [websiteLink, setWebsiteLink] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isOpen && db && userProfile) {
      const fetchData = async () => {
        try {
          // Fetch all users for mapping
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersData = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
          setAllUsers(usersData);

          // Fetch teams
          let teamsData: Team[] = [];
          if (isAdmin) {
            const teamsSnapshot = await getDocs(collection(db, 'teams'));
            teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          } else {
            const { query, where } = await import('firebase/firestore');
            const teamsQuery = query(collection(db, 'teams'), where('allMembers', 'array-contains', userProfile.uid));
            const teamsSnapshot = await getDocs(teamsQuery);
            teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          }
          setTeams(teamsData);

          if (initialData?.teamId) {
            setSelectedTeamId(initialData.teamId);
          } else if (defaultTeamId) {
            setSelectedTeamId(defaultTeamId);
          } else if (teamsData.length === 1) {
            setSelectedTeamId(teamsData[0].id);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
      fetchData();
    }
  }, [isOpen, isAdmin, userProfile, initialData, defaultTeamId]);

  useEffect(() => {
    if (selectedTeamId) {
      const team = teams.find(t => t.id === selectedTeamId);
      if (team) {
        const members = allUsers.filter(u => team.allMembers?.includes(u.uid));
        setTeamMembers(members);
      } else {
        setTeamMembers([]);
      }
    } else if (isAdmin) {
      setTeamMembers(allUsers);
    } else {
      setTeamMembers([userProfile as UserProfile]);
    }
  }, [selectedTeamId, teams, allUsers, isAdmin, userProfile]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setProjectType(initialData.projectType || 'client');
        setClientName(initialData.clientName || '');
        setClientEmail(initialData.clientEmail || '');
        setDescription(initialData.description || '');
        setPrice(initialData.price ?? '');
        setPriority(initialData.priority || 'Medium');
        setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
        setEndDate(initialData.endDate || '');
        setStage(initialData.stage || 'First Stage');
        setStatus(initialData.status || 'Active');
        setWebsiteLink(initialData.websiteLink || '');
        setTelegramChatId(initialData.telegramChatId || '');
        setAssignedTo(initialData.assignedTo || '');
        setSelectedTeamId(initialData.teamId || defaultTeamId || '');
      } else {
        setTitle('');
        setProjectType('client');
        setClientName('');
        setClientEmail('');
        setDescription('');
        setPrice('');
        setPriority('Medium');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setStage('First Stage');
        setStatus('Active');
        setWebsiteLink('');
        setTelegramChatId('');
        setAssignedTo('');
        // selectedTeamId is handled in the other useEffect
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      title,
      projectType,
      clientName: projectType === 'client' ? clientName : undefined,
      clientEmail: projectType === 'client' ? clientEmail : undefined,
      description,
      price: projectType === 'client' ? (Number(price) || 0) : undefined,
      priority,
      startDate: projectType === 'client' ? startDate : undefined,
      endDate: projectType === 'client' ? endDate : undefined,
      stage,
      status,
      websiteLink,
      telegramChatId,
      additionalLinks: initialData?.additionalLinks || [],
      ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
      ...(assignedTo ? { 
        assignedTo, 
        assignedBy: userProfile?.uid,
        assignmentStatus: 'pending'
      } : {})
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${
              theme === 'dark' ? 'bg-[#0f172a]/90 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' : 'bg-white/90 backdrop-blur-2xl border-gray-200 shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
            }`}
          >
            <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'
            }`}>
              <h2 className={`text-base sm:text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{initialData ? 'Edit Project' : 'New Project'}</h2>
              <button 
                onClick={onClose} 
                className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin">
              <div className="space-y-1.5">
                <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Project Title</label>
                <input 
                  required
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                  }`}
                  placeholder="e.g. Website Redesign"
                />
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Project Type</label>
                <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setProjectType('client')}
                    className={`flex-1 text-xs sm:text-sm py-2 rounded-lg font-medium transition-all ${projectType === 'client' ? 'bg-white dark:bg-[#1a2235] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    Client Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectType('personal')}
                    className={`flex-1 text-xs sm:text-sm py-2 rounded-lg font-medium transition-all ${projectType === 'personal' ? 'bg-white dark:bg-[#1a2235] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    Personal Project 
                  </button>
                </div>
              </div>

              {projectType === 'client' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Client Name</label>
                    <input 
                      required
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                      }`}
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Client Email</label>
                    <input 
                      type="email" 
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                      }`}
                      placeholder="e.g. client@example.com"
                    />
                  </div>
                </div>
              )}

              {projectType === 'client' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Price ($)</label>
                    <input 
                      required
                      type="number" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                      }`}
                      placeholder="e.g. 1500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Description (Optional)</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm resize-none ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                  }`}
                  placeholder="Brief project details..."
                />
              </div>

              {projectType === 'client' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Start Date</label>
                    <input 
                      required
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50 focus:ring-blue-500/50'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>End Date</label>
                    <input 
                      required
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50 focus:ring-blue-500/50'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm appearance-none ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50 focus:ring-blue-500/50'
                    }`}
                  >
                    <option value="High" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>High</option>
                    <option value="Medium" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Medium</option>
                    <option value="Low" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Low</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm appearance-none ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50 focus:ring-blue-500/50'
                    }`}
                  >
                    <option value="Active" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Active</option>
                    <option value="Revision" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Revision</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Stage</label>
                <select 
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm appearance-none ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50 focus:ring-blue-500/50'
                  }`}
                >
                  <option value="First Stage" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>First Stage</option>
                  <option value="Middle Stage" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Middle Stage</option>
                  <option value="Final Stage" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Final Stage</option>
                  <option value="Delivered" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Delivered</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Website Link (Optional)</label>
                <input 
                  type="url" 
                  value={websiteLink}
                  onChange={(e) => setWebsiteLink(e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                  }`}
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Specific Telegram Chat ID (Optional)</label>
                <input 
                  type="text" 
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/50'
                  }`}
                  placeholder="e.g. -100123456789"
                />
              </div>

              {teams.length > 0 && !defaultTeamId && (
                <div className="space-y-1.5">
                  <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Team (Optional)</label>
                  <select 
                    value={selectedTeamId}
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value);
                      setAssignedTo(''); // Reset assigned user when team changes
                    }}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm appearance-none ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50 focus:ring-blue-500/50'
                    }`}
                  >
                    <option value="" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>No Team</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id} className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {teamMembers.length > 0 && (
                <div className="space-y-1.5">
                  <label className={`block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Assign To (Optional)</label>
                  <select 
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-xs sm:text-sm appearance-none ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50 focus:ring-blue-500/50'
                    }`}
                  >
                    <option value="" className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.uid} value={member.uid} className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>
                        {member.displayName || member.email} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form>

            <div className={`px-4 sm:px-6 py-4 sm:py-5 border-t flex justify-end space-x-3 shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'
            }`}>
              <button 
                type="button"
                onClick={onClose}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-all ${
                  theme === 'dark'
                    ? 'text-gray-400 bg-transparent border border-white/10 hover:bg-white/5 hover:text-white'
                    : 'text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                type="submit"
                className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-500 focus:outline-none transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]"
              >
                {initialData ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
