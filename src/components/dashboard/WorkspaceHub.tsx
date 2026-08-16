import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Briefcase, Bot, GraduationCap, Code2, Users, CheckSquare, 
  KeyRound, LayoutTemplate, Plus, ArrowRight, Sparkles, Clock, 
  Calendar, Shield, ExternalLink, Mail, Tag, DollarSign, 
  TrendingUp, Layers, CheckCircle2, Circle, AlertCircle, Compass, 
  Zap, Star, Search, ChevronRight, Bookmark, BookOpen
} from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';

interface WorkspaceHubProps {
  onNavigate: (view: 'home' | 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates' | 'personal-projects' | 'notifier-settings' | 'password-manager' | 'education' | 'ai-notes', teamId?: string, chat?: boolean) => void;
  onNewProject: () => void;
  onOpenNotes?: () => void;
}

interface RecentAINote {
  id: string;
  chatTitle: string;
  aiProvider: string;
  category: string;
  type: string;
  questionCount?: number;
  createdAt: string;
}

interface HubTodo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string;
}

interface CourseCount {
  totalCourses: number;
}

export function WorkspaceHub({ onNavigate, onNewProject, onOpenNotes }: WorkspaceHubProps) {
  const { projects } = useProjects();
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();

  const [recentAINotes, setRecentAINotes] = useState<RecentAINote[]>([]);
  const [totalAINotesCount, setTotalAINotesCount] = useState<number>(0);
  const [todos, setTodos] = useState<HubTodo[]>([]);
  const [courseCount, setCourseCount] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Welcome');

  // Filter client projects vs personal projects
  const clientProjects = projects.filter(p => 
    p.projectType !== 'personal' && (p.assignedTo === user?.uid || (!p.assignedTo && p.userId === user?.uid))
  );
  const personalProjects = projects.filter(p => p.projectType === 'personal' && p.userId === user?.uid);

  const activeClientProjects = clientProjects.filter(p => p.status === 'Active' || p.status === 'Revision');
  const deliveredClientProjects = clientProjects.filter(p => p.status === 'Delivered');
  const totalPipelineValue = activeClientProjects.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  // Time & Greeting
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');

      setCurrentTime(now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch AI Notes & Count
  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'aiNotes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(4)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: RecentAINote[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({
          id: doc.id,
          chatTitle: data.chatTitle || 'Untitled Note',
          aiProvider: data.aiProvider || 'AI',
          category: data.category || 'General',
          type: data.type || 'Chat',
          questionCount: data.questionCount || 1,
          createdAt: data.createdAt || ''
        });
      });
      setRecentAINotes(items);
    }, (err) => {
      console.warn('AI Notes listener error:', err);
    });

    // Also get full count
    const qAll = query(collection(db, 'aiNotes'), where('userId', '==', user.uid));
    const unsubAll = onSnapshot(qAll, (snapshot) => {
      setTotalAINotesCount(snapshot.size);
    });

    return () => {
      unsubscribe();
      unsubAll();
    };
  }, [user]);

  // Fetch Courses Count
  useEffect(() => {
    if (!user || !db) return;
    const qCourses = query(collection(db, 'courses'), where('userId', '==', user.uid));
    const unsub = onSnapshot(qCourses, (snapshot) => {
      setCourseCount(snapshot.size);
    });
    return () => unsub();
  }, [user]);

  // Fetch Pending To-Dos
  useEffect(() => {
    if (!user || !db) return;
    const qTodos = query(
      collection(db, 'todos'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(qTodos, (snapshot) => {
      const list: HubTodo[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        list.push({
          id: doc.id,
          title: d.title || '',
          completed: !!d.completed,
          priority: d.priority || 'Medium',
          dueDate: d.dueDate
        });
      });
      setTodos(list);
    });
    return () => unsub();
  }, [user]);

  const handleToggleTodo = async (todo: HubTodo) => {
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        completed: !todo.completed,
        updatedAt: new Date().toISOString()
      });
      toast.success(todo.completed ? 'Task reopened' : 'Task completed');
    } catch (e) {
      toast.error('Failed to update task');
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'Gemini':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ChatGPT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Claude':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DeepSeek':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 max-w-7xl mx-auto">
      {/* 1. Header Banner & Greeting */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-[#0f172a] via-[#1e1b4b]/20 to-[#0f172a] border-white/10 shadow-2xl shadow-black/40' 
          : 'bg-gradient-to-br from-white via-red-50/20 to-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                theme === 'dark' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Workspace Command Center
              </span>
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentTime}
              </span>
            </div>
            
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">
                {userProfile?.displayName || user?.displayName?.split(' ')[0] || 'Developer'}
              </span> 👋
            </h1>
            
            <p className={`text-sm sm:text-base max-w-2xl leading-relaxed ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Here is the central snapshot of your active client deliverables, AI prompt vaults, learning modules, and developer toolkits.
            </p>
          </div>

          {/* Quick Actions Cluster */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={onNewProject}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} />
              <span>New Client Project</span>
            </button>

            <button
              onClick={() => onNavigate('ai-notes')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide border transition-all flex items-center gap-2 ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10' 
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'
              }`}
            >
              <Bot size={16} className="text-purple-400" />
              <span>AI Notes Vault</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Vital Signs & KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {/* Client Projects KPI */}
        <div 
          onClick={() => onNavigate('dashboard')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
            theme === 'dark'
              ? 'bg-[#0f172a] border-white/5 hover:border-blue-500/40 hover:bg-blue-500/[0.02]'
              : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Briefcase size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              View <ChevronRight size={12} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeClientProjects.length}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Running Projects
              </p>
              {totalPipelineValue > 0 && (
                <span className="text-xs font-mono font-bold text-emerald-500">
                  ${totalPipelineValue}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AI Notes Vault KPI */}
        <div 
          onClick={() => onNavigate('ai-notes')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
            theme === 'dark'
              ? 'bg-[#0f172a] border-white/5 hover:border-purple-500/40 hover:bg-purple-500/[0.02]'
              : 'bg-white border-slate-200 hover:border-purple-400 hover:shadow-md shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <Bot size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Vault <ChevronRight size={12} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {totalAINotesCount}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                AI Chats & Prompts
              </p>
              <span className="text-[11px] font-mono text-purple-400">
                Multi-Agent
              </span>
            </div>
          </div>
        </div>

        {/* Educational Workspace KPI */}
        <div 
          onClick={() => onNavigate('education')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
            theme === 'dark'
              ? 'bg-[#0f172a] border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]'
              : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <GraduationCap size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Study <ChevronRight size={12} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {courseCount}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Learning Modules
              </p>
              <span className="text-[11px] font-mono text-emerald-400">
                Courses
              </span>
            </div>
          </div>
        </div>

        {/* Personal Workspace & Tasks KPI */}
        <div 
          onClick={() => onNavigate('personal-projects')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
            theme === 'dark'
              ? 'bg-[#0f172a] border-white/5 hover:border-rose-500/40 hover:bg-rose-500/[0.02]'
              : 'bg-white border-slate-200 hover:border-rose-400 hover:shadow-md shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <Code2 size={20} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Sandbox <ChevronRight size={12} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {personalProjects.length}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Personal Builds
              </p>
              <span className="text-[11px] font-mono text-rose-400">
                Labs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Module Suites (Bento Explorer) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Workspace Suites
            </h2>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Choose a dedicated module to manage your development workflow
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Suite 1: Client Projects */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0f172a] border-white/10 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10'
                : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                  <Briefcase size={24} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {activeClientProjects.length} Active
                </span>
              </div>

              <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-blue-500 transition-colors">
                Client Projects Manager
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                WordPress & custom web development workflow, milestone stages, deadlines, budgets, and kanban board.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-white/5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {deliveredClientProjects.length} Delivered
              </span>
              <span className="text-xs font-bold text-blue-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Workspace <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Suite 2: AI Notes Vault */}
          <div 
            onClick={() => onNavigate('ai-notes')}
            className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0f172a] border-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10'
                : 'bg-white border-slate-200 hover:border-purple-400 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                  <Bot size={24} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  theme === 'dark' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {totalAINotesCount} Notes
                </span>
              </div>

              <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-purple-500 transition-colors">
                AI Chat Notes Vault
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Categorized prompt repository, multi-AI outputs (Gemini, ChatGPT, Claude), code snippets & instant search.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-white/5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Cloud Synced
              </span>
              <span className="text-xs font-bold text-purple-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open AI Vault <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Suite 3: Educational Workspace */}
          <div 
            onClick={() => onNavigate('education')}
            className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0f172a] border-white/10 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10'
                : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {courseCount} Modules
                </span>
              </div>

              <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-emerald-500 transition-colors">
                Educational Workspace
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Structured academic courses, chapters, coding tutorials, and in-depth development study guides.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-white/5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Semester / Chapter Wise
              </span>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Education <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Suite 4: Personal Workspace */}
          <div 
            onClick={() => onNavigate('personal-projects')}
            className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0f172a] border-white/10 hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-500/10'
                : 'bg-white border-slate-200 hover:border-rose-400 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
                  <Code2 size={24} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  theme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {personalProjects.length} Builds
                </span>
              </div>

              <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-rose-500 transition-colors">
                Personal Workspace & Labs
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Private dev prototypes, coding experiments, sandbox repositories, and side utility tools.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-white/5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Developer Sandbox
              </span>
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Personal <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Suite 5: Team Collaborations */}
          <div 
            onClick={() => onNavigate('teams')}
            className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0f172a] border-white/10 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10'
                : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                  <Users size={24} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  Collaboration
                </span>
              </div>

              <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-amber-500 transition-colors">
                Team Workspaces & Chat
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Shared team project boards, role delegation, real-time messaging, and shared client progress.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-white/5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Team Hub
              </span>
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Teams <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* Suite 6: Utilities (Passwords, Templates, Todos) */}
          <div 
            onClick={() => onNavigate('password-manager')}
            className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-[#0f172a] border-white/10 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10'
                : 'bg-white border-slate-200 hover:border-cyan-400 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500 group-hover:scale-110 transition-transform">
                  <KeyRound size={24} />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    AES-256
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-cyan-500 transition-colors">
                Developer Utilities & Security
              </h3>
              <p className={`text-xs leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Encrypted password manager, Elementor template library, and daily task checklist.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-white/5">
              <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Security Suite
              </span>
              <span className="text-xs font-bold text-cyan-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Security <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Real-time Live Glance: Active Projects & Recent AI Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Client Projects Stream */}
        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${
          theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-blue-500" />
              <h3 className={`font-bold text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Active Client Deliverables
              </h3>
            </div>
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {activeClientProjects.length === 0 ? (
            <div className={`py-10 text-center rounded-2xl border border-dashed ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200 bg-slate-50'
            }`}>
              <Briefcase size={28} className="mx-auto text-slate-500 mb-2 opacity-50" />
              <p className="text-xs font-bold">No active running projects right now</p>
              <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Ready to take on a new WordPress or web build?
              </p>
              <button
                onClick={onNewProject}
                className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Add First Project</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeClientProjects.slice(0, 4).map(project => (
                <div 
                  key={project.id}
                  onClick={() => onNavigate('dashboard')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm truncate group-hover:text-blue-500 transition-colors">
                        {project.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${
                        project.status === 'Revision' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span>{project.clientName || 'Client'}</span>
                      <span>•</span>
                      <span>{project.stage || 'In Progress'}</span>
                      {project.price && (
                        <>
                          <span>•</span>
                          <span className="font-mono font-bold text-emerald-400">${project.price}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent AI Notes & Prompts Stream */}
        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${
          theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-purple-500" />
              <h3 className={`font-bold text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Recent AI Notes & Prompts
              </h3>
            </div>
            <button
              onClick={() => onNavigate('ai-notes')}
              className="text-xs font-bold text-purple-500 hover:text-purple-400 flex items-center gap-1"
            >
              <span>Vault</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {recentAINotes.length === 0 ? (
            <div className={`py-10 text-center rounded-2xl border border-dashed ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.01]' : 'border-slate-200 bg-slate-50'
            }`}>
              <Bot size={28} className="mx-auto text-purple-500 mb-2 opacity-50" />
              <p className="text-xs font-bold">No AI chat notes saved yet</p>
              <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Archive your best Gemini, ChatGPT, and Claude coding sessions.
              </p>
              <button
                onClick={() => onNavigate('ai-notes')}
                className="mt-3 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Save New AI Note</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAINotes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => onNavigate('ai-notes')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/5 hover:border-purple-500/30 hover:bg-purple-500/[0.02]'
                      : 'bg-slate-50/70 border-slate-200 hover:border-purple-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${getProviderColor(note.aiProvider)}`}>
                        {note.aiProvider}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm truncate group-hover:text-purple-400 transition-colors">
                        {note.chatTitle}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-400">
                      <span className="truncate">{note.category}</span>
                      <span>•</span>
                      <span className="font-mono">{note.questionCount || 1} words</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Daily Task Checklist Glance */}
      {todos.length > 0 && (
        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${
          theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-red-500" />
              <h3 className={`font-bold text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Quick Tasks & To-Dos
              </h3>
            </div>
            <button
              onClick={() => onNavigate('todos')}
              className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1"
            >
              <span>Manage To-Dos</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {todos.map(todo => (
              <div
                key={todo.id}
                onClick={() => handleToggleTodo(todo)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  todo.completed
                    ? theme === 'dark' ? 'bg-white/[0.01] border-white/5 opacity-50' : 'bg-slate-100/60 border-slate-200 opacity-60'
                    : theme === 'dark' ? 'bg-white/[0.03] border-white/10 hover:border-red-500/30' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className={todo.completed ? 'text-emerald-500 shrink-0' : 'text-slate-400 hover:text-red-500 shrink-0 transition-colors'}>
                  {todo.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </div>
                <span className={`text-xs font-medium truncate flex-1 ${
                  todo.completed ? 'line-through text-slate-400' : theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {todo.title}
                </span>
                {todo.priority === 'High' && !todo.completed && (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
