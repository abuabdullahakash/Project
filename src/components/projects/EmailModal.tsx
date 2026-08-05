import React, { useState } from 'react';
import { Project } from '../../types';
import { X, Send, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendEmailNotification } from '../../utils/emailUtils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTheme } from '../../context/ThemeContext';

interface EmailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmailModal({ project, isOpen, onClose }: EmailModalProps) {
  const { theme } = useTheme();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useBodyScrollLock(isOpen);

  if (!isOpen || !project) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.clientEmail) {
      alert("Client email is not set for this project.");
      return;
    }

    setIsSending(true);
    try {
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${project.clientName},</h2>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <br>
          <p>Best regards,<br>ProjectHub Team</p>
        </div>
      `;
      
      const success = await sendEmailNotification(project.clientEmail, subject, html);
      if (success) {
        alert("Email sent successfully!");
        onClose();
        setSubject('');
        setMessage('');
      } else {
        alert("Failed to send email. Please check your configuration.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("An error occurred while sending the email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
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
            className={`relative rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden flex flex-col ${
              theme === 'dark' ? 'bg-[#0f172a]/90 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' : 'bg-white/90 backdrop-blur-2xl border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
            }`}
          >
            <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
            }`}>
              <h2 className={`text-base sm:text-lg font-semibold flex items-center gap-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                <Mail size={18} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                Send Email to {project.clientName}
              </h2>
              <button 
                onClick={onClose}
                className={`transition-colors p-1 rounded-lg ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-4 sm:p-6 space-y-4 overflow-y-auto scrollbar-thin">
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                }`}>To</label>
                <input
                  type="email"
                  value={project.clientEmail || 'No email provided'}
                  disabled
                  className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm cursor-not-allowed ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                }`}>Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                  className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-[#0f172a] border-white/10 text-white placeholder:text-gray-600' 
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-slate-500'
                }`}>Message *</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className={`w-full border rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none h-32 sm:h-40 resize-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-[#0f172a] border-white/10 text-white placeholder:text-gray-600' 
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
                  }`}
                />
              </div>

              <div className={`flex justify-end gap-3 pt-4 border-t shrink-0 ${
                theme === 'dark' ? 'border-white/10' : 'border-slate-100'
              }`}>
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !project.clientEmail}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
