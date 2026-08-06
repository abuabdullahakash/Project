import React, { useState, useEffect } from 'react';
import { Plus, Menu, LogIn, LogOut, BookOpen, LayoutDashboard, Shield, Image, Users, Sun, Moon, Bell, Code2, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GlobalNotesDrawer } from './GlobalNotesDrawer';
import { NotificationDrawer } from './NotificationDrawer';
import { Sidebar } from './Sidebar';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Toaster, toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
  onNewProject: () => void;
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  currentView?: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates' | 'personal-projects' | 'notifier-settings' | 'password-manager' | 'education';
  onNavigate?: (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos' | 'templates' | 'personal-projects' | 'notifier-settings' | 'password-manager' | 'education', teamId?: string, chat?: boolean) => void;
  isNotesOpen?: boolean;
  onOpenNotes?: () => void;
  onCloseNotes?: () => void;
}

export function Layout({ 
  children, 
  onNewProject, 
  isSidebarOpen,
  onOpenSidebar, 
  onCloseSidebar,
  currentView = 'dashboard', 
  onNavigate,
  isNotesOpen = false,
  onOpenNotes,
  onCloseNotes
}: LayoutProps) {
  const { user, signIn, logOut, isConfigured, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const initialLoadRef = React.useRef(true);
  const onNavigateRef = React.useRef(onNavigate);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);

    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIframe) {
      // Direct opening to the shared link in a new tab where service worker and PWA prompt can trigger cleanly
      window.open(window.location.href, '_blank');
      return;
    }

    if (!deferredPrompt) {
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isiOS) {
        toast.info("iOS বা Safari-তে ইন্সটল করতে: নিচে Share (শেয়ার) আইকনে ট্যাপ করে 'Add to Home Screen' সিলেক্ট করুন।", {
          duration: 8000
        });
      } else {
        toast.info("পাসওয়ার্ড ম্যানেজার ইনস্টল করতে: ব্রাউজারের ৩-ডট (⋮) মেনুতে ক্লিক করে 'Save and share' (সেভ এবং শেয়ার) -> 'Install App' (অ্যাপ ইনস্টল করুন) অপশনটি সিলেক্ট করুন।", {
          duration: 10000
        });
      }
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success("অ্যাপটি ইন্সটল করার জন্য ধন্যবাদ! (Thanks for installing the app!)");
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Error prompting installation:', err);
    }
  };

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    if (!db || !user) return;

    initialLoadRef.current = true;

    // Request notification permission if not already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);

      // Trigger system notifications for new messages
      if (!initialLoadRef.current && 'Notification' in window && Notification.permission === 'granted') {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const title = data.title || 'New Notification';
            const options = {
              body: data.message || '',
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              vibrate: [200, 100, 200],
              data: {
                url: data.teamId ? `/?teamId=${data.teamId}&chat=true` : '/'
              }
            };

            try {
              // Try standard desktop notification first
              const notification = new Notification(title, options);
              notification.onclick = () => {
                window.focus();
                if (data.teamId && onNavigateRef.current) {
                  onNavigateRef.current('team-dashboard', data.teamId, true);
                }
                notification.close();
              };
            } catch (e) {
              // Mobile browsers (like Chrome for Android) throw a TypeError on `new Notification()`
              // They require using the Service Worker registration instead.
              if (e instanceof TypeError && 'serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                  registration.showNotification(title, options);
                }).catch((swError) => {
                  console.error('Service Worker notification failed:', swError);
                });
              } else {
                console.error('Error showing notification:', e);
              }
            }
          }
        });
      }

      initialLoadRef.current = false;
    });

    return () => unsubscribe();
  }, [user]);

  useBodyScrollLock(isSidebarOpen || isNotificationsOpen);

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      theme === 'dark' ? 'bg-[#0f172a] text-slate-300' : 'bg-[#f1f5f9] text-slate-600'
    } font-sans selection:bg-red-500/30 flex flex-col`}>
      {/* Premium Glassmorphic Header */}
      <header className={`sticky top-0 z-40 w-full backdrop-blur-2xl border-b transition-all duration-500 ${
        theme === 'dark' 
          ? 'bg-red-950/40 border-red-900/50 shadow-[0_4px_30px_rgba(127,29,29,0.1)]' 
          : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side: Menu & Logo */}
            <div className="flex items-center gap-4">
              <button 
                onClick={onOpenSidebar}
                className={`p-2 rounded-full transition-all ${
                  theme === 'dark' 
                    ? 'text-red-200/70 hover:text-white hover:bg-red-900/50' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Menu size={20} />
              </button>
              
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => onNavigate?.('dashboard')}
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all">
                  <LayoutDashboard size={16} className="text-white" />
                </div>
                <h1 className={`text-xl font-display font-bold tracking-tight hidden sm:block ${
                  theme === 'dark' ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-400' : 'text-slate-900'
                }`}>
                  Project<span className={theme === 'dark' ? 'text-white font-medium' : 'text-red-600 font-medium'}>Hub</span>
                </h1>
              </div>
            </div>

              {/* Right side: Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Personal Workspace (Desktop Only) */}
              {user && (
                <button 
                  onClick={() => onNavigate?.('personal-projects')}
                  className={`hidden md:flex p-2 rounded-full transition-all relative ${
                    theme === 'dark' 
                      ? 'text-purple-400 hover:text-white hover:bg-purple-900/50' 
                      : 'text-purple-600 hover:text-purple-900 hover:bg-purple-100'
                  }`}
                  title="Personal Workspace"
                >
                  <Code2 size={18} />
                </button>
              )}

              {/* Educational Workspace Icon (Desktop Only) */}
              {user && (
                <button 
                  onClick={() => onNavigate?.('education')}
                  className={`hidden md:flex p-2 rounded-full transition-all relative ${
                    currentView === 'education'
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : theme === 'dark' 
                        ? 'text-red-200/70 hover:text-white hover:bg-red-900/50' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Educational Workspace"
                >
                  <GraduationCap size={18} />
                </button>
              )}

              {/* Global Notes (Desktop Only) */}
              {user && (
                <button 
                  onClick={onOpenNotes}
                  className={`hidden md:flex p-2 rounded-full transition-all relative ${
                    theme === 'dark' 
                      ? 'text-red-200/70 hover:text-white hover:bg-red-900/50' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Global Notes & Links"
                >
                  <BookOpen size={18} />
                </button>
              )}

              {/* Notifications */}
              {user && (
                <button 
                  onClick={() => setIsNotificationsOpen(true)}
                  className={`p-2 rounded-full transition-all relative ${
                    theme === 'dark' 
                      ? 'text-red-200/70 hover:text-white hover:bg-red-900/50' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-red-950/40 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                  )}
                </button>
              )}

              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all ${
                  theme === 'dark' 
                    ? 'text-red-200/70 hover:text-white hover:bg-red-900/50' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-red-900/50 mx-1"></div>

              {user && (
                <button 
                  onClick={onNewProject}
                  className="bg-red-600 text-white hover:bg-red-500 px-4 sm:px-5 py-2 rounded-full flex items-center justify-center gap-2 font-semibold transition-all text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:scale-105 active:scale-95"
                >
                  <Plus size={16} /> <span className="hidden sm:inline-block">New Project</span>
                </button>
              )}

              {!user && isConfigured && (
                <button onClick={signIn} className={`text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 px-4 py-2 rounded-full border border-transparent ${
                  theme === 'dark' ? 'text-red-200/80 hover:text-white hover:bg-red-900/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}>
                  <LogIn size={16} /> Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-8 w-full">
        {children}
      </main>

      {/* Global Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={onCloseSidebar}
        currentView={currentView}
        onNavigate={onNavigate || (() => {})}
        onOpenNotes={onOpenNotes || (() => {})}
      />

      <GlobalNotesDrawer 
        isOpen={isNotesOpen} 
        onClose={onCloseNotes || (() => {})} 
      />

      <NotificationDrawer 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={onNavigate}
      />

      <Toaster 
        position="bottom-right" 
        theme={theme === 'dark' ? 'dark' : 'light'} 
        toastOptions={{
          className: theme === 'dark' 
            ? '!bg-[#0f172a] !border-white/10 !text-slate-200' 
            : '!bg-white !border-slate-200 !text-slate-800'
        }}
      />
    </div>
  );
}

