import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, LayoutGrid, Users, Shield, BookOpen, LogOut, 
  LayoutDashboard, Settings, HelpCircle, Bell, Link as LinkIcon,
  CheckSquare, Briefcase, LayoutTemplate, Code2, KeyRound, GraduationCap,
  User as UserIcon, ChevronsUpDown, ChevronRight, Sparkles, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ProfileModal } from '../profile/ProfileModal';
import { AppSettingsModal } from '../profile/AppSettingsModal';
import { SupportModal } from '../profile/SupportModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates' | 'personal-projects' | 'notifier-settings' | 'password-manager' | 'education';
  onNavigate: (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates' | 'personal-projects' | 'notifier-settings' | 'password-manager' | 'education', teamId?: string, chat?: boolean) => void;
  onOpenNotes: () => void;
}

export function Sidebar({ isOpen, onClose, currentView, onNavigate, onOpenNotes }: SidebarProps) {
  const { user, userProfile, isAdmin, logOut } = useAuth();
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close popup menu when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setIsProfileMenuOpen(false);
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://ais-pre-awl4ili6lnyxfrz4hs5vun-326659427957.asia-southeast1.run.app");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'personal-projects', label: 'Personal Workspace', icon: Code2 },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'todos', label: 'To-Do List', icon: CheckSquare },
    { id: 'education', label: 'Educational Notes', icon: GraduationCap },
    { id: 'password-manager', label: 'Password Manager', icon: KeyRound },
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
            </div>

            {/* Footer / User Profile with Popover */}
            <div className={`p-4 border-t relative ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'}`}>
              {/* Profile Popover Menu (Pops up above user profile card) */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    {/* Invisible backdrop to dismiss popover when clicking outside */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsProfileMenuOpen(false)} 
                    />
                    
                    <motion.div
                      ref={profileMenuRef}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.96 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      className={`absolute bottom-full left-4 right-4 mb-3 rounded-2xl shadow-2xl z-20 overflow-hidden border ${
                        theme === 'dark' 
                          ? 'bg-[#0f172a] border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] divide-white/5' 
                          : 'bg-white border-slate-200 shadow-[0_12px_40px_rgba(0,0,0,0.15)] divide-slate-100'
                      } divide-y`}
                    >
                      {/* Popover Header with User Profile Details */}
                      <div className={`p-4 flex items-center gap-3 ${
                        theme === 'dark' ? 'bg-white/[0.03]' : 'bg-slate-50/80'
                      }`}>
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-red-500/20 overflow-hidden shrink-0">
                          {userProfile?.photoURL || user?.photoURL ? (
                            <img src={userProfile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {userProfile?.displayName || user?.displayName || 'User'}
                            </p>
                            {isAdmin ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                                Admin
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                Member
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      {/* Menu Options */}
                      <div className="p-2 space-y-1">
                        {/* Edit Profile */}
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsProfileModalOpen(true);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all group ${
                            theme === 'dark'
                              ? 'text-slate-300 hover:text-white hover:bg-white/5'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'bg-white/5 group-hover:bg-white/10 text-slate-300' : 'bg-slate-100 group-hover:bg-slate-200 text-slate-700'
                          }`}>
                            <UserIcon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">Edit Profile</p>
                            <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Photo & display name</p>
                          </div>
                          <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>

                        {/* Notifier Settings */}
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onNavigate('notifier-settings');
                            onClose();
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all group ${
                            currentView === 'notifier-settings'
                              ? theme === 'dark' ? 'bg-red-500/10 text-red-400 font-semibold' : 'bg-red-50 text-red-600 font-semibold'
                              : theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                          }`}>
                            <Bell size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">Notifier Settings</p>
                            <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Telegram bot & alerts</p>
                          </div>
                          <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>

                        {/* App Settings */}
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsSettingsModalOpen(true);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all group ${
                            theme === 'dark'
                              ? 'text-slate-300 hover:text-white hover:bg-white/5'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
                          }`}>
                            <Settings size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">Settings</p>
                            <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Theme, sounds & cache</p>
                          </div>
                          <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>

                        {/* Support */}
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsSupportModalOpen(true);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all group ${
                            theme === 'dark'
                              ? 'text-slate-300 hover:text-white hover:bg-white/5'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            <HelpCircle size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">Support & FAQs</p>
                            <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Contact & documentation</p>
                          </div>
                          <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </div>

                      {/* Sign Out */}
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            logOut();
                            onClose();
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                            theme === 'dark'
                              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                          }`}
                        >
                          <LogOut size={15} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Profile Bar Button Trigger */}
              <button
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all text-left group ${
                  isProfileMenuOpen
                    ? theme === 'dark'
                      ? 'bg-white/10 border border-red-500/40 shadow-lg ring-2 ring-red-500/20'
                      : 'bg-slate-100 border border-red-500/30 shadow-md ring-2 ring-red-500/20'
                    : theme === 'dark'
                      ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                      : 'bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20 overflow-hidden shrink-0">
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
                  <p className={`text-[10px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</p>
                </div>
                <div className={`p-1.5 rounded-lg transition-transform ${
                  isProfileMenuOpen ? 'rotate-180 text-red-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}>
                  <ChevronsUpDown size={16} />
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Modals triggered from Profile Popover */}
    <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    <AppSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </>
  );
}

