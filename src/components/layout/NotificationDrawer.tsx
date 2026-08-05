import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { Notification as AppNotification } from '../../types';
import { X, Bell, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams' | 'todos', teamId?: string, chat?: boolean) => void;
}

export function NotificationDrawer({ isOpen, onClose, onNavigate }: NotificationDrawerProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!db || !user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!db || !user) return;
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;

      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAll = async () => {
    if (!db || !user) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'error': return <XCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('Notifications enabled successfully!');
    } else {
      alert('Notification permission denied. Please enable it in your browser settings.');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.teamId && onNavigate) {
      onNavigate('team-dashboard', n.teamId, true);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative w-full sm:max-w-md h-full shadow-2xl flex flex-col border-l ${
              theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  theme === 'dark' ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'
                }`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h2 className={`text-base font-semibold tracking-tight ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Notifications</h2>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                    theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
                  }`}>
                    {unreadCount} Unread
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {('Notification' in window) && Notification.permission !== 'granted' && (
                  <button 
                    onClick={requestNotificationPermission}
                    className={`p-1.5 rounded-lg transition-all text-xs font-medium px-3 ${
                      theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    title="Enable System Notifications"
                  >
                    Enable Alerts
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={clearAll}
                    className={`p-1.5 rounded-lg transition-all ${
                      theme === 'dark' ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Clear All"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={onClose} className={`p-1.5 rounded-lg transition-all ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {notifications.length > 0 && unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className={`w-full py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all border mb-4 ${
                    theme === 'dark' 
                      ? 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white' 
                      : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  Mark all as read
                </button>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-600' : 'text-slate-400'}`}>Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-white/5 text-gray-700' : 'bg-slate-50 text-slate-300'}`}>
                    <Bell size={32} />
                  </div>
                  <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No notifications</h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>We'll notify you when something happens.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    layout
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`relative p-4 rounded-2xl border transition-all group ${n.teamId ? 'cursor-pointer' : ''} ${
                      !n.read 
                        ? theme === 'dark' ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                        : theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-xs font-bold tracking-tight truncate ${
                            theme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}>{n.title}</h4>
                          <span className={`text-[9px] font-medium whitespace-nowrap ${
                            theme === 'dark' ? 'text-gray-600' : 'text-slate-400'
                          }`}>
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${
                          theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                        }`}>{n.message}</p>
                        
                        <div className="flex items-center gap-2 mt-3">
                          {!n.read && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                                theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              }`}
                            >
                              <Check size={10} />
                              Mark Read
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                              theme === 'dark' ? 'bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-400/10' : 'bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 size={10} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
