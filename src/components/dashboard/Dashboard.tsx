import React, { useState } from 'react';
import { ProjectList } from '../projects/ProjectList';
import { KanbanBoard } from '../projects/KanbanBoard';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Briefcase, CheckCircle, AlertTriangle, TrendingUp, LayoutGrid, List, Users } from 'lucide-react';

interface DashboardProps {
  isSidebarOpen: boolean;
  onSidebarClose: () => void;
  onNavigate?: (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams', teamId?: string, chat?: boolean) => void;
  onOpenNotes?: () => void;
}

export function Dashboard({ isSidebarOpen, onSidebarClose, onNavigate, onOpenNotes }: DashboardProps) {
  const { projects } = useProjects();
  const { user, isAdmin, logOut } = useAuth();
  const { theme } = useTheme();
  
  // Filter for personal dashboard: projects assigned to the user, or created by the user and not assigned to anyone else, excluding 'personal' projectType
  const personalProjects = projects.filter(p => 
    p.projectType !== 'personal' && (p.assignedTo === user?.uid || (!p.assignedTo && p.userId === user?.uid))
  );

  const [activeTab, setActiveTab] = useState<'running' | 'delivered' | 'revision'>('running');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  const runningProjects = personalProjects.filter(p => p.status === 'Active' || p.status === 'Revision');
  
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const deliveredInSelectedMonth = personalProjects.filter(p => {
    if (p.status !== 'Delivered') return false;
    const monthMatch = selectedMonth === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getMonth() === parseInt(selectedMonth));
    const yearMatch = selectedYear === 'All' || (p.deliveredAt && new Date(p.deliveredAt).getFullYear() === parseInt(selectedYear));
    return monthMatch && yearMatch;
  });

  const inRevision = personalProjects.filter(p => p.status === 'Revision');
  
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
      <h2 className={`text-lg font-bold mb-2 col-span-full tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Overview</h2>
      
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
            ? theme === 'dark' ? 'bg-blue-500/20 text-blue-500' : 'bg-blue-500/10 text-blue-600'
            : theme === 'dark' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 text-slate-500'
        }`}>
          <Briefcase size={20} />
        </div>
        <div className="flex-1">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
            activeTab === 'running' 
              ? theme === 'dark' ? 'text-blue-50' : 'text-blue-700'
              : theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>{runningProjects.length}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 ${
            activeTab === 'running' 
              ? theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
              : 'text-slate-400'
          }`}>Running Projects</div>
        </div>
        {activeTab === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
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
            ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-emerald-500/10 text-emerald-600'
            : theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-500'
        }`}>
          <CheckCircle size={20} />
        </div>
        <div className="flex-1">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
            activeTab === 'delivered' 
              ? theme === 'dark' ? 'text-emerald-50' : 'text-emerald-700'
              : theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>{deliveredInSelectedMonth.length}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 ${
            activeTab === 'delivered' 
              ? theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
              : 'text-slate-400'
          }`}>Delivered</div>
        </div>
        {activeTab === 'delivered' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
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
            ? theme === 'dark' ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-500/10 text-amber-600'
            : theme === 'dark' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 text-slate-500'
        }`}>
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight leading-none ${
            activeTab === 'revision' 
              ? theme === 'dark' ? 'text-amber-50' : 'text-amber-700'
              : theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>{inRevision.length}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 ${
            activeTab === 'revision' 
              ? theme === 'dark' ? 'text-amber-300' : 'text-amber-600'
              : 'text-slate-400'
          }`}>In Revision</div>
        </div>
        {activeTab === 'revision' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
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

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Grid */}
      <StatsContent />

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
                  <option value="All" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>All Months</option>
                  <option value="0" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>January</option>
                  <option value="1" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>February</option>
                  <option value="2" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>March</option>
                  <option value="3" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>April</option>
                  <option value="4" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>May</option>
                  <option value="5" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>June</option>
                  <option value="6" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>July</option>
                  <option value="7" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>August</option>
                  <option value="8" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>September</option>
                  <option value="9" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>October</option>
                  <option value="10" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>November</option>
                  <option value="11" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>December</option>
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
                  <option value="All" className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>All Years</option>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year.toString()} className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>{year}</option>;
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
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>All</option>
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>First Stage</option>
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Middle Stage</option>
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Final Stage</option>
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Delivered</option>
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
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>All</option>
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>High</option>
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Medium</option>
                    <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Low</option>
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
                  <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Nearest Deadline</option>
                  <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Highest Priority</option>
                  <option className={theme === 'dark' ? 'bg-[#0f172a] text-gray-200' : 'bg-white text-slate-900'}>Recently Updated</option>
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
            projects={personalProjects}
            activeTab={activeTab}
            filterStage={filterStage}
            filterPriority={filterPriority}
            sortBy={sortBy}
            onlyOverdue={onlyOverdue}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        ) : (
          <KanbanBoard 
            projects={personalProjects}
            activeTab={activeTab}
            filterStage={filterStage}
            filterPriority={filterPriority}
            sortBy={sortBy}
            onlyOverdue={onlyOverdue}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}
      </div>
    </div>
  );
}
