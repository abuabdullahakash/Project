import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Trash2, Download, History, FileText, AlertCircle, CheckCircle2, MoreVertical, Trash, Users } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, getDoc, where, Timestamp, writeBatch, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ChatMessage } from '../../types';
import { jsPDF } from 'jspdf';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export function ChatDrawer({ isOpen, onClose, teamId, teamName }: ChatDrawerProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanMenu, setShowCleanMenu] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!db || !teamId || !isOpen) return;

    const q = query(
      collection(db, 'teams', teamId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as ChatMessage[];
      
      // Filter out messages deleted for the current user
      const filteredMsgs = msgs.filter(m => !m.deletedFor?.includes(user?.uid || ''));
      
      setMessages(filteredMsgs);
      setStatus(null);
    }, (error) => {
      console.error("Chat fetch error:", error);
      setStatus({ 
        type: 'error', 
        message: error.code === 'permission-denied' 
          ? "You don't have permission to view this chat. Please ensure you are a team member." 
          : "Failed to load messages. Please try again." 
      });
    });

    return () => unsubscribe();
  }, [teamId, isOpen, user?.uid]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMessageMenu(null);
    if (activeMessageMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMessageMenu]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !db) return;

    try {
      await addDoc(collection(db, 'teams', teamId, 'messages'), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhoto: user.photoURL || '',
        timestamp: serverTimestamp(),
        teamId: teamId
      });

      // Fetch team to get members
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        const allMembers = new Set([
          teamData.createdBy,
          teamData.leaderId,
          teamData.coLeaderId,
          ...(teamData.managerIds || []),
          ...(teamData.memberIds || [])
        ].filter(Boolean));
        
        allMembers.delete(user.uid);
        
        if (allMembers.size > 0) {
          const batch = writeBatch(db);
          allMembers.forEach(memberId => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: memberId,
              title: `New message in ${teamName}`,
              message: `${user.displayName || 'Someone'}: ${newMessage.trim()}`,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString(),
              teamId: teamId
            });
          });
          await batch.commit();
        }
      }

      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleUnsendForEveryone = async (messageId: string) => {
    if (!db || !teamId) return;
    try {
      await deleteDoc(doc(db, 'teams', teamId, 'messages', messageId));
      setActiveMessageMenu(null);
    } catch (error) {
      console.error("Error unsending message:", error);
      setStatus({ type: 'error', message: 'Failed to unsend message.' });
    }
  };

  const handleUnsendForMe = async (messageId: string) => {
    if (!db || !teamId || !user) return;
    try {
      await updateDoc(doc(db, 'teams', teamId, 'messages', messageId), {
        deletedFor: arrayUnion(user.uid)
      });
      setActiveMessageMenu(null);
    } catch (error) {
      console.error("Error unsending message for me:", error);
      setStatus({ type: 'error', message: 'Failed to unsend message for you.' });
    }
  };

  const exportChat = (format: 'pdf' | 'txt', data: ChatMessage[]) => {
    const fileName = `chat_log_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'txt') {
      const content = data.map(m => {
        const date = m.timestamp instanceof Timestamp ? m.timestamp.toDate() : new Date();
        return `[${date.toLocaleString()}] ${m.senderName}: ${m.text}`;
      }).join('\n');
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Chat Log: ${teamName}`, 20, 20);
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleString()}`, 20, 30);
      
      let y = 40;
      data.forEach((m, index) => {
        const date = m.timestamp instanceof Timestamp ? m.timestamp.toDate() : new Date();
        const line = `[${date.toLocaleString()}] ${m.senderName}: ${m.text}`;
        
        // Handle page breaks
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        
        const splitText = doc.splitTextToSize(line, 170);
        doc.text(splitText, 20, y);
        y += (splitText.length * 5) + 2;
      });
      
      doc.save(`${fileName}.pdf`);
    }
  };

  const cleanupChat = async (period: 'week' | 'month' | 'all') => {
    if (!db || !teamId) return;
    setIsCleaning(true);
    setShowCleanMenu(false);

    try {
      let q;
      const now = new Date();
      
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        q = query(collection(db, 'teams', teamId, 'messages'), where('timestamp', '<', Timestamp.fromDate(weekAgo)));
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        q = query(collection(db, 'teams', teamId, 'messages'), where('timestamp', '<', Timestamp.fromDate(monthAgo)));
      } else {
        q = query(collection(db, 'teams', teamId, 'messages'));
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setStatus({ type: 'success', message: 'No messages to delete in this period.' });
        setIsCleaning(false);
        return;
      }

      // Export before delete
      const messagesToExport = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as ChatMessage[];
      
      // Ask user to export? For now, we'll just export as TXT automatically as a backup
      // In a real app, you might show a confirmation modal with export options
      exportChat('txt', messagesToExport);

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      setStatus({ type: 'success', message: `Successfully deleted ${snapshot.size} messages.` });
    } catch (error) {
      console.error("Cleanup error:", error);
      setStatus({ type: 'error', message: 'Failed to clean up chat.' });
    } finally {
      setIsCleaning(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl'
            } border-l`}
          >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
                }`}>
                  <Users size={20} />
                </div>
                <div>
                  <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {teamName} Chat
                  </h2>
                  <p className="text-xs text-slate-500">Team Communication</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowCleanMenu(!showCleanMenu)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {showCleanMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl z-50 border ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="p-2 space-y-1">
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Export Chat
                          </div>
                          <button
                            onClick={() => { exportChat('pdf', messages); setShowCleanMenu(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-900'
                            }`}
                          >
                            <FileText size={16} /> Export as PDF
                          </button>
                          <button
                            onClick={() => { exportChat('txt', messages); setShowCleanMenu(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-900'
                            }`}
                          >
                            <Download size={16} /> Export as TXT
                          </button>
                          
                          <div className="h-px bg-slate-700/50 my-1" />
                          
                          <div className="px-3 py-2 text-xs font-semibold text-red-500 uppercase tracking-wider">
                            Clean Up (Auto-Export)
                          </div>
                          <button
                            onClick={() => cleanupChat('week')}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              theme === 'dark' ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                            }`}
                          >
                            <History size={16} /> Delete Previous Week
                          </button>
                          <button
                            onClick={() => cleanupChat('month')}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              theme === 'dark' ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                            }`}
                          >
                            <Trash2 size={16} /> Delete Previous Month
                          </button>
                          <button
                            onClick={() => cleanupChat('all')}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors font-medium ${
                              theme === 'dark' ? 'hover:bg-red-900/40 text-red-400' : 'hover:bg-red-100 text-red-700'
                            }`}
                          >
                            <Trash size={16} /> Clear All History
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Status Message */}
            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`px-4 py-2 text-sm flex items-center gap-2 ${
                    status.type === 'success' 
                      ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                      : (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700')
                  }`}
                >
                  {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {status.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/50'
            }`}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <Send size={32} />
                  </div>
                  <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    No messages yet
                  </h3>
                  <p className="text-sm text-slate-500">
                    Start the conversation with your team members.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.uid;
                  const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && showAvatar && (
                        <span className="text-[10px] font-medium text-slate-500 ml-10 mb-1">
                          {msg.senderName}
                        </span>
                      )}
                      <div className={`flex gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <div className="w-8 h-8 flex-shrink-0">
                            {showAvatar ? (
                              msg.senderPhoto ? (
                                <img src={msg.senderPhoto} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {msg.senderName.charAt(0)}
                                </div>
                              )
                            ) : null}
                          </div>
                        )}
                        <div 
                          onClick={() => setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setActiveMessageMenu(activeMessageMenu === msg.id ? null : msg.id);
                          }}
                          className={`relative px-4 py-2 rounded-2xl text-sm cursor-pointer transition-all ${
                          isMe 
                            ? 'bg-red-600 text-white rounded-tr-none shadow-md shadow-red-900/10 hover:bg-red-700' 
                            : (theme === 'dark' 
                                ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700 hover:bg-slate-700' 
                                : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm hover:bg-slate-50')
                        }`}>
                          {msg.text}
                          <div className={`text-[9px] mt-1 ${isMe ? 'text-red-100/70' : 'text-slate-500'}`}>
                            {msg.timestamp instanceof Timestamp 
                              ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Sending...'}
                          </div>

                          {/* Message Context Menu */}
                          <AnimatePresence>
                            {activeMessageMenu === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className={`absolute bottom-full mb-2 z-[70] min-w-[140px] rounded-xl shadow-xl border ${
                                  isMe ? 'right-0' : 'left-0'
                                } ${
                                  theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-1.5 space-y-1">
                                  {isMe && (
                                    <button
                                      onClick={() => handleUnsendForEveryone(msg.id)}
                                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                                        theme === 'dark' ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-600'
                                      }`}
                                    >
                                      <Trash2 size={14} /> Unsend for Everyone
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUnsendForMe(msg.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                                      theme === 'dark' ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    <Trash size={14} /> Unsend for Me
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t ${
              theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className={`flex-1 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all border ${
                    theme === 'dark' 
                      ? 'bg-slate-800 text-white border-slate-700 placeholder-slate-500' 
                      : 'bg-white text-slate-900 border-slate-300 placeholder-slate-400 focus:border-red-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={`p-2 rounded-xl transition-all ${
                    newMessage.trim()
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={20} />
                </button>
              </form>
            </div>

            {/* Loading Overlay */}
            {isCleaning && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-[60]">
                <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 ${
                  theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                }`}>
                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Cleaning up chat...</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
