import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { TeamDashboard } from './components/dashboard/TeamDashboard';
import { ProjectFormModal } from './components/projects/ProjectFormModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { TeamManagement } from './components/teams/TeamManagement';
import { TodoManager } from './components/todo/TodoManager';
import { TemplateLibrary } from './components/templates/TemplateLibrary';
import { PersonalDashboard } from './components/dashboard/PersonalDashboard';
import { PortfolioApp } from './components/portfolio/PortfolioApp';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { SmartProjectCreator } from './components/dashboard/SmartProjectCreator';
import { NotifierSettings } from './components/admin/NotifierSettings';
import { PasswordManager } from './components/passwords/PasswordManager';
import { EducationManager } from './components/education/EducationManager';
import { useProjects } from './hooks/useProjects';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { Shield, LogIn } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(window.location.search);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates' | 'personal-projects' | 'notifier-settings' | 'password-manager' | 'education'>('dashboard');
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [chatOpenTrigger, setChatOpenTrigger] = useState<number>(0);
  const { addProject } = useProjects();
  const { user, signIn } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('teamId');
    const chat = params.get('chat');
    if (teamId) {
      setCurrentView('team-dashboard');
      setSelectedTeamId(teamId);
      if (chat === 'true') {
        setChatOpenTrigger(prev => prev + 1);
      }
      // Clean up URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCreateProject = (projectData: any) => {
    addProject(projectData);
    setIsModalOpen(false);
  };

  const handleNavigate = (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates' | 'personal-projects' | 'notifier-settings' | 'password-manager' | 'education', teamId?: string, chat?: boolean) => {
    setCurrentView(view);
    if (teamId) {
      setSelectedTeamId(teamId);
    }
    if (chat) {
      setChatOpenTrigger(prev => prev + 1);
    }
  };

  if (currentPath.startsWith('/portfolio')) {
    return (
      <PortfolioApp 
        initialPath={currentPath} 
        onNavigate={(p) => {
          window.history.pushState({}, '', p);
          const url = new URL(p, window.location.origin);
          setCurrentPath(url.pathname);
          setCurrentSearch(url.search);
        }} 
      />
    );
  }

  return (
    <Layout 
      onNewProject={() => setIsModalOpen(true)}
      isSidebarOpen={isSidebarOpen}
      onOpenSidebar={() => setIsSidebarOpen(true)}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      currentView={currentView}
      onNavigate={handleNavigate}
      isNotesOpen={isNotesOpen}
      onOpenNotes={() => setIsNotesOpen(true)}
      onCloseNotes={() => setIsNotesOpen(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
           key={user ? (currentPath.startsWith('/project/') ? currentPath : currentView) : 'auth'}
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -15 }}
           transition={{ type: 'spring', stiffness: 300, damping: 30 }}
           className="h-full flex-1"
        >
          {!user ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in duration-500">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(220,38,38,0.2)] ${
                theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'
              }`}>
                <Shield size={40} className="text-red-500" />
              </div>
              <h2 className={`text-3xl font-bold mb-4 tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Welcome to ProjectHub</h2>
              <p className={`max-w-md mb-8 leading-relaxed ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Please sign in to view your dashboard, manage your projects, and securely store your data in the cloud.
              </p>
              <button 
                onClick={signIn}
                className="bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 px-8 py-3.5 rounded-full flex items-center justify-center gap-3 font-bold transition-all text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-95 hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:-translate-y-0.5"
              >
                <LogIn size={18} /> Sign In to Continue
              </button>
            </div>
          ) : currentPath.startsWith('/project/') ? (
            <ProjectDetailsPage
              projectId={currentPath.split('/')[2]}
              onBack={() => {
                window.history.pushState({}, '', '/');
                setCurrentPath('/');
              }}
            />
          ) : currentView === 'dashboard' ? (
            <Dashboard 
              isSidebarOpen={isSidebarOpen} 
              onSidebarClose={() => setIsSidebarOpen(false)} 
              onNavigate={handleNavigate}
              onOpenNotes={() => setIsNotesOpen(true)}
            />
          ) : currentView === 'team-dashboard' ? (
            <TeamDashboard 
              isSidebarOpen={isSidebarOpen} 
              onSidebarClose={() => setIsSidebarOpen(false)} 
              initialTeamId={selectedTeamId}
              chatOpenTrigger={chatOpenTrigger}
              onNavigate={handleNavigate}
              onNewProject={() => setIsModalOpen(true)}
              onOpenNotes={() => setIsNotesOpen(true)}
            />
          ) : currentView === 'teams' ? (
            <TeamManagement 
              onNavigate={handleNavigate} 
              initialTeamId={selectedTeamId}
              chatOpenTrigger={chatOpenTrigger}
            />
          ) : currentView === 'todos' ? (
            <TodoManager />
          ) : currentView === 'education' ? (
            <EducationManager />
          ) : currentView === 'password-manager' ? (
            <PasswordManager />
          ) : currentView === 'templates' ? (
            <TemplateLibrary />
          ) : currentView === 'personal-projects' ? (
            <PersonalDashboard onNewProject={() => setIsModalOpen(true)} />
          ) : currentView === 'notifier-settings' ? (
            <NotifierSettings />
          ) : (
            <AdminPanel />
          )}
        </motion.div>
      </AnimatePresence>
      {user && (
        <>
          <ProjectFormModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSubmit={handleCreateProject}
            defaultTeamId={currentView === 'team-dashboard' ? selectedTeamId : undefined}
          />
          <SmartProjectCreator />
        </>
      )}
    </Layout>
  );
}
