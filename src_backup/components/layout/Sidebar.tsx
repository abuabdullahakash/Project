import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, LayoutGrid, Users, Shield, BookOpen, LogOut, 
  LayoutDashboard, Settings, HelpCircle, Bell, Link as LinkIcon,
  CheckSquare, Briefcase, LayoutTemplate
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ProfileModal } from '../profile/ProfileModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates';
  onNavigate: (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates', teamId?: string, chat?: boolean) => void;
  onOpenNotes: () => void;
}

export function Sidebar({ isOpen, onClose, currentView, onNavigate, onOpenNotes }: SidebarProps) {
  const { user, userProfile, isAdmin, logOut } = useAuth();
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'todos', label: 'To-Do List', icon: CheckSquare },
    { id: 'templates', label: 'Elementor Templates', icon: LayoutTemplate },
    { id: 'portfolio', label: 'View Portfolio', icon: Briefcase, adminOnly: true, action: () => {
      window.history.pushState({}, '', '/portfolio');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } },
    { id: 'portfolio-manager', label: 'Portfolio Manager', icon: Settings, adminOnly: true, action: () => {
      window.history.pushState({}, '', '/portfolio?edit=true');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } },
    { id: 'admin', label: 'Admin Panel', icon: Shield, adminOnly: true },
    { id: 'notes', label: 'Global Notes', icon: BookOpen, action: onOpenNotes, hideOnDesktop: true },
    { id: 'link', label: copied ? 'Link Copied!' : 'Copy App Link', icon: LinkIcon, action: handleCopyLink },
  ];

  const sidebarVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'tween',
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
  };

  const itemVariants = {
    closed: { opacity: 0, x: -20 },
    open: (i: number) => ({ 
      opacity: 1, 
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: 'easeOut'
      }
    }),
  };

  return (
    <>
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
          />

          {/* Sidebar Content */}
          <motion.div
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`fixed top-0 left-0 h-full w-80 z-50 shadow-2xl flex flex-col ${
              theme === 'dark' 
                ? 'bg-[#0f172a] border-r border-white/5' 
                : 'bg-white border-r border-slate-200'
            }`}
          >
            {/* Header */}
            <div className={`p-6 flex items-center justify-between border-b ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <LayoutDashboard size={20} className="text-white" />
                </div>
                <div>
                  <h2 className={`font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    ProjectHub
                  </h2>
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Premium v2.0</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className={`p-2 rounded-full transition-all ${
                  theme === 'dark' 
                    ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Main Navigation
                </p>
                <div className="space-y-1">
                  {menuItems.map((item, i) => {
                    if (item.adminOnly && !isAdmin) return null;
                    
                    const isActive = currentView === item.id;
                    const Icon = item.icon;

                    return (
                      <motion.button
                        key={item.id}
                        custom={i}
                        variants={itemVariants}
                        whileHover={{ x: 5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (item.action) {
                            item.action();
                          } else {
                            onNavigate(item.id as any);
                          }
                          if (!item.action || item.id !== 'link') {
                            onClose();
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                          item.hideOnDesktop ? 'md:hidden ' : ''
                        }${
                          isActive
                            ? theme === 'dark'
                              ? 'bg-red-500/10 text-red-500 font-semibold border border-red-500/20'
                              : 'bg-red-50 text-red-600 font-semibold border border-red-100'
                            : theme === 'dark'
                              ? 'text-slate-400 hover:text-white hover:bg-white/5'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-red-500' : 'group-hover:scale-110 transition-transform'} />
                        <span className="text-sm">{item.label}</span>
                        {isActive && (
                          <motion.div 
                            layoutId="active-pill"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className={`px-4 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Preferences
                </p>
                <div className="space-y-1">
                  <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}>
                    <Bell size={18} />
                    <span className="text-sm">Notifications</span>
                  </button>
                  <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}>
                    <Settings size={18} />
                    <span className="text-sm">Settings</span>
                  </button>
                  <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}>
                    <HelpCircle size={18} />
                    <span className="text-sm">Support</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer / User Profile */}
            <div className={`p-4 border-t ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
              <div 
                onClick={() => setIsProfileModalOpen(true)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  theme === 'dark' ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20 overflow-hidden">
                  {userProfile?.photoURL || user?.photoURL ? (
                    <img src={userProfile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {userProfile?.displayName || user?.displayName || 'User'}
                  </p>
                  <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); logOut(); onClose(); }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </>
  );
}
