import React, { useState, useEffect } from 'react';
import { ProjectList } from '../projects/ProjectList';
import { KanbanBoard } from '../projects/KanbanBoard';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Briefcase, CheckCircle, AlertTriangle, TrendingUp, LayoutGrid, List, Users, MessageSquare, Plus } from 'lucide-react';
import { collection, query, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, Team } from '../../types';
import { ChatDrawer } from '../teams/ChatDrawer';

interface TeamDashboardProps {
  isSidebarOpen: boolean;
  onSidebarClose: () => void;
  initialTeamId?: string;
  chatOpenTrigger?: number;
  onNavigate?: (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams', teamId?: string) => void;
  onNewProject?: () => void;
  onOpenNotes?: () => void;
}

export function TeamDashboard({ isSidebarOpen, onSidebarClose, initialTeamId, chatOpenTrigger, onNavigate, onNewProject, onOpenNotes }: TeamDashboardProps) {
  const { projects } = useProjects();
  const { userProfile, isAdmin, logOut } = useAuth();
  const { theme } = useTheme();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialTeamId || '');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (initialTeamId) {
      setSelectedTeamId(initialTeamId);
    }
  }, [initialTeamId]);

  useEffect(() => {
    if (chatOpenTrigger && chatOpenTrigger > 0) {
      setIsChatOpen(true);
    }
  }, [chatOpenTrigger]);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!db || !userProfile) return;
      try {
        if (isAdmin) {
          const teamsSnapshot = await getDocs(collection(db, 'teams'));
          const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          setTeams(teamsData);
          if (teamsData.length > 0 && !selectedTeamId) {
            setSelectedTeamId(teamsData[0].id);
          }
        } else {
          // Fetch teams where user is a member
          const teamsQuery = query(collection(db, 'teams'), where('allMembers', 'array-contains', userProfile.uid));
          const teamsSnapshot = await getDocs(teamsQuery);
          const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          
          // Filter to only teams where user is manager, leader, or co-leader
          const authorizedTeams = teamsData.filter(team => 
            (team.managerIds && team.managerIds.includes(userProfile.uid)) || 
            team.leaderId === userProfile.uid || 
            team.coLeaderId === userProfile.uid
          );
          
          setTeams(authorizedTeams);
          if (authorizedTeams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(authorizedTeams[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [isAdmin, userProfile]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!db || !selectedTeamId) return;
      try {
        const team = teams.find(t => t.id === selectedTeamId);
        if (!team) return;
        
        const membersData: UserProfile[] = [];
        const addedMemberIds = new Set<string>();
        
        // Fetch leader
        if (team.leaderId && !addedMemberIds.has(team.leaderId)) {
          const leaderDoc = await getDoc(doc(db, 'users', team.leaderId));
          if (leaderDoc.exists()) {
            membersData.push(leaderDoc.data() as UserProfile);
            addedMemberIds.add(team.leaderId);
          }
        }
        
        // Fetch co-leader
        if (team.coLeaderId && !addedMemberIds.has(team.coLeaderId)) {
          const coLeaderDoc = await getDoc(doc(db, 'users', team.coLeaderId));
          if (coLeaderDoc.exists()) {
            membersData.push(coLeaderDoc.data() as UserProfile);
            addedMemberIds.add(team.coLeaderId);
          }
        }
        
        // Fetch members
        for (const memberId of team.memberIds) {
          if (!addedMemberIds.has(memberId)) {
            const memberDoc = await getDoc(doc(db, 'users', memberId));
            if (memberDoc.exists()) {
              membersData.push(memberDoc.data() as UserProfile);
              addedMemberIds.add(memberId);
            }
          }
        }
        
        setTeamMembers(membersData);
        setSelectedMemberId('all');
      } catch (error) {
        console.error("Error fetching team members:", error);
      }
    };
    fetchMembers();
  }, [selectedTeamId, teams]);

  // Filter projects for the team dashboard
  const teamProjects = projects.filter(p => {
    if (p.teamId !== selectedTeamId) return false;
    if (selectedMemberId !== 'all' && p.assignedTo !== selectedMemberId) return false;
    return true;
  });

  const [activeTab, setActiveTab] = useState<'running' | 'delivered' | 'revision'>('running');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  const runningProjects = teamProjects.filter(p => p.status === 'Active' || p.status === 'Revision');
  
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const deliveredInSelectedMonth = teamProjects.filter(p => {
    if (p.status !== 'Delivered') return false;
    const monthMatch = selectedMonth === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getMonth() === parseInt(selectedMonth));
    const yearMatch = selectedYear === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getFullYear() === parseInt(selectedYear));
    return monthMatch && yearMatch;
  });

  const inRevision = teamProjects.filter(p => p.status === 'Revision');
  
  const totalValue = (() => {
    if (activeTab === 'running') {
      return runningProjects.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    }
    if (activeTab === 'delivered') {
      return deliveredInSelectedMonth.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    }
    return 0;
  })();

  const valueLabel = (() => {
    if (activeTab === 'running') return 'Total Running Value';
    if (activeTab === 'delivered') return 'Total Delivered Value';
    return 'Total Value';
  })();

  const [filterStage, setFilterStage] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [sortBy, setSortBy] = useState('Nearest Deadline');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const StatsContent = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div 
        onClick={() => setActiveTab('running')}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
          activeTab === 'running' 
            ? theme === 'dark'
              ? 'bg-gradient-to-br from-blue-500/10 to-indigo-600/5 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
              : 'bg-blue-50 border-blue-200 shadow-[0_4px_12px_rgba(59,130,246,0.08)]'
            : theme === 'dark'
              ? 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <div className={`p-3 rounded-xl ${
          activeTab === 'running' 
            ? theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-600'
            : theme === 'dark' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 text-slate-500'
        }`}>
          <Briefcase size={20} />
        </div>
        <div className="flex-1">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
            activeTab === 'running' 
              ? theme === 'dark' ? 'text-blue-50' : 'text-blue-600'
              : theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>{runningProjects.length}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 ${
            activeTab === 'running' 
              ? theme === 'dark' ? 'text-blue-300' : 'text-blue-500'
              : 'text-slate-400'
          }`}>Running Projects</div>
        </div>
        {activeTab === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
      </div>

      <div 
        onClick={() => setActiveTab('delivered')}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
          activeTab === 'delivered' 
            ? theme === 'dark'
              ? 'bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
              : 'bg-emerald-50 border-emerald-200 shadow-[0_4px_12px_rgba(16,185,129,0.08)]'
            : theme === 'dark'
              ? 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <div className={`p-3 rounded-xl ${
          activeTab === 'delivered' 
            ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'
            : theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-500'
        }`}>
          <CheckCircle size={20} />
        </div>
        <div className="flex-1">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
            activeTab === 'delivered' 
              ? theme === 'dark' ? 'text-emerald-50' : 'text-emerald-600'
              : theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>{deliveredInSelectedMonth.length}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 ${
            activeTab === 'delivered' 
              ? theme === 'dark' ? 'text-emerald-300' : 'text-emerald-500'
              : 'text-slate-400'
          }`}>Delivered</div>
        </div>
        {activeTab === 'delivered' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
      </div>

      <div 
        onClick={() => setActiveTab('revision')}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
          activeTab === 'revision' 
            ? theme === 'dark'
              ? 'bg-gradient-to-br from-amber-500/10 to-orange-600/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]' 
              : 'bg-amber-50 border-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.08)]'
            : theme === 'dark'
              ? 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <div className={`p-3 rounded-xl ${
          activeTab === 'revision' 
            ? theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/10 text-amber-600'
            : theme === 'dark' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 text-slate-500'
        }`}>
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
            activeTab === 'revision' 
              ? theme === 'dark' ? 'text-amber-50' : 'text-amber-600'
              : theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>{inRevision.length}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 ${
            activeTab === 'revision' 
              ? theme === 'dark' ? 'text-amber-300' : 'text-amber-500'
              : 'text-slate-400'
          }`}>In Revision</div>
        </div>
        {activeTab === 'revision' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />}
      </div>

      <div className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-4 ${
        theme === 'dark'
          ? 'border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-600/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
          <TrendingUp size={20} />
        </div>
        <div className="flex-1">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
            theme === 'dark' ? 'text-purple-50' : 'text-purple-600'
          }`}>${totalValue.toLocaleString()}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 ${
            theme === 'dark' ? 'text-purple-300' : 'text-purple-500'
          }`}>{valueLabel}</div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Users size={48} className="text-gray-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-white mb-2">No Team Found</h2>
        <p className="text-gray-400">You are not assigned to any team yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Grid */}
      <StatsContent />
      <div className={`border rounded-3xl p-4 sm:p-6 shadow-sm backdrop-blur-sm ${
        theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'
      }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onNavigate?.('teams')}
                className={`p-2.5 rounded-xl transition-colors ${
                  theme === 'dark' ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Back to Teams"
              >
                <Users size={24} />
              </button>
              <div>
                <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {teams.find(t => t.id === selectedTeamId)?.name || 'Team'} Dashboard
                </h1>
                <p className="text-sm text-gray-400">Manage and monitor team projects</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsChatOpen(true)}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                }`}
              >
                <MessageSquare size={18} />
                Team Chat
              </button>

              {onNewProject && (
                <button
                  onClick={onNewProject}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  New Project
                </button>
              )}
            </div>
          </div>

          {/* Member Tabs */}
          <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
            <button
              onClick={() => setSelectedMemberId('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedMemberId === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : theme === 'dark'
                    ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              All Members
            </button>
            {teamMembers.map(member => (
              <button
                key={member.uid}
                onClick={() => setSelectedMemberId(member.uid)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  selectedMemberId === member.uid
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : theme === 'dark'
                      ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {member.photoURL ? (
                  <img src={member.photoURL} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                    {member.displayName ? member.displayName.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                  </div>
                )}
                {member.displayName || member.email.split('@')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full">
        {/* Filters */}
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-5 mb-6 sm:mb-10 items-stretch sm:items-end shadow-sm backdrop-blur-sm ${
          theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'
        }`}>
          {activeTab === 'delivered' && (
            <>
              <div className="space-y-2 flex-1 min-w-[140px]">
                <label className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Delivery Month</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all appearance-none ${
                    theme === 'dark' 
                      ? 'bg-black/50 border-white/10 text-gray-200 focus:border-white/30 focus:ring-white/30' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option value="All" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>All Months</option>
                  <option value="0" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>January</option>
                  <option value="1" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>February</option>
                  <option value="2" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>March</option>
                  <option value="3" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>April</option>
                  <option value="4" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>May</option>
                  <option value="5" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>June</option>
                  <option value="6" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>July</option>
                  <option value="7" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>August</option>
                  <option value="8" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>September</option>
                  <option value="9" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>October</option>
                  <option value="10" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>November</option>
                  <option value="11" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>December</option>
                </select>
              </div>
              <div className="space-y-2 flex-1 min-w-[100px]">
                <label className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Year</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all appearance-none ${
                    theme === 'dark' 
                      ? 'bg-black/50 border-white/10 text-gray-200 focus:border-white/30 focus:ring-white/30' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option value="All" className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>All Years</option>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year.toString()} className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>{year}</option>;
                  })}
                </select>
              </div>
            </>
          )}
          
          {activeTab !== 'delivered' && (
            <>
              <div className="grid grid-cols-2 sm:flex sm:flex-1 gap-4 w-full sm:w-auto">
                <div className="space-y-2 flex-1 min-w-[120px]">
                  <label className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Stage</label>
                  <select 
                    value={filterStage}
                    onChange={e => setFilterStage(e.target.value)}
                    className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all appearance-none ${
                      theme === 'dark' 
                        ? 'bg-black/50 border-white/10 text-gray-200 focus:border-white/30 focus:ring-white/30' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  >
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>All</option>
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>First Stage</option>
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Middle Stage</option>
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Final Stage</option>
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Delivered</option>
                  </select>
                </div>
                <div className="space-y-2 flex-1 min-w-[120px]">
                  <label className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Priority</label>
                  <select 
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all appearance-none ${
                      theme === 'dark' 
                        ? 'bg-black/50 border-white/10 text-gray-200 focus:border-white/30 focus:ring-white/30' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  >
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>All</option>
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>High</option>
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Medium</option>
                    <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Low</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 flex-1 min-w-[120px]">
                <label className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Sort by</label>
                <select 
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all appearance-none ${
                    theme === 'dark' 
                      ? 'bg-black/50 border-white/10 text-gray-200 focus:border-white/30 focus:ring-white/30' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                >
                  <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Nearest Deadline</option>
                  <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Highest Priority</option>
                  <option className={theme === 'dark' ? 'bg-[#020617] text-gray-200' : 'bg-white text-slate-900'}>Recently Updated</option>
                </select>
              </div>
              <div className="flex items-center gap-3 py-1 sm:pb-3.5 px-2">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    id="onlyOverdue"
                    checked={onlyOverdue}
                    onChange={e => setOnlyOverdue(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className={`w-10 h-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                    theme === 'dark' ? 'bg-white/10 peer-checked:bg-white/30' : 'bg-slate-200 peer-checked:bg-blue-500'
                  }`}></div>
                </div>
                <label htmlFor="onlyOverdue" className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none">Overdue Only</label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 justify-center sm:justify-end sm:ml-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none flex justify-center p-2.5 rounded-xl transition-all ${
                viewMode === 'list' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : theme === 'dark'
                    ? 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex-1 sm:flex-none flex justify-center p-2.5 rounded-xl transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : theme === 'dark'
                    ? 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <ProjectList 
            projects={teamProjects}
            activeTab={activeTab}
            filterStage={filterStage}
            filterPriority={filterPriority}
            sortBy={sortBy}
            onlyOverdue={onlyOverdue}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            defaultTeamId={selectedTeamId}
          />
        ) : (
          <KanbanBoard 
            projects={teamProjects}
            activeTab={activeTab}
            filterStage={filterStage}
            filterPriority={filterPriority}
            sortBy={sortBy}
            onlyOverdue={onlyOverdue}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            defaultTeamId={selectedTeamId}
          />
        )}
      </div>

      <ChatDrawer 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        teamId={selectedTeamId}
        teamName={teams.find(t => t.id === selectedTeamId)?.name || 'Team'}
      />
    </div>
  );
}
