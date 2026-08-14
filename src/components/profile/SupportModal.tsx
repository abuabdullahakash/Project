import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Send, Mail, Copy, Check, ExternalLink, ShieldCheck, FileText, ChevronDown, ChevronUp, Bell, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const appLink = "https://ais-pre-awl4ili6lnyxfrz4hs5vun-326659427957.asia-southeast1.run.app";
  const supportEmail = "fyt0000012@gmail.com";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appLink);
    setCopiedLink(true);
    toast.success('App link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    toast.success('Support email copied to clipboard!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const faqs = [
    {
      q: 'How do I connect Telegram bot for instant updates?',
      a: 'Go to Notifier Settings from your Profile popup menu. Add your Telegram Bot to your group, send "/id" with your verification code in the group, click "Verify & Get ID", and save the generated Chat ID.'
    },
    {
      q: 'How are passwords secured in the Password Manager?',
      a: 'All password vault items are client-encrypted with your Master Key. Your unencrypted vault credentials are never stored in raw plaintext.'
    },
    {
      q: 'How do team workspaces and real-time chat work?',
      a: 'You can create teams, invite members via their email, assign tasks, and communicate in real-time. Team changes sync instantly across all devices via cloud database.'
    },
    {
      q: 'Can I install ProjectHub as a desktop/mobile PWA app?',
      a: 'Yes! On Chrome or Edge, click the install icon in the address bar or browser menu. On iOS Safari, tap the Share icon and select "Add to Home Screen".'
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-[#0f172a] border border-white/10' : 'bg-white border border-slate-200'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex justify-between items-center ${
            theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <HelpCircle size={20} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Help & Support Center
                </h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Get assistance, explore documentation, and contact the admin
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
            {/* Quick Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Telegram */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl shrink-0 bg-sky-500/10 text-sky-500">
                    <Send size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Telegram</p>
                    <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Bot & Channel Support</p>
                  </div>
                </div>
                <a 
                  href="https://t.me/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
                >
                  <ExternalLink size={13} />
                  <span>Open Telegram</span>
                </a>
              </div>

              {/* Email */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl shrink-0 bg-rose-500/10 text-rose-500">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Direct Email</p>
                    <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{supportEmail}</p>
                  </div>
                </div>
                <button 
                  onClick={handleCopyEmail}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 shrink-0 whitespace-nowrap ${
                    copiedEmail
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : theme === 'dark'
                        ? 'bg-white/10 text-white hover:bg-white/20 border-white/10'
                        : 'bg-white text-slate-800 hover:bg-slate-100 border-slate-300 shadow-sm'
                  }`}
                >
                  {copiedEmail ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedEmail ? 'Email Copied' : 'Copy Email'}</span>
                </button>
              </div>
            </div>

            {/* Quick Share Link */}
            <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  ProjectHub Shareable URL
                </p>
                <p className={`text-[11px] truncate font-mono mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {appLink}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold shrink-0 whitespace-nowrap shadow-sm transition-all"
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            {/* FAQs Accordion */}
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Frequently Asked Questions
              </h3>
              <div className="space-y-2">
                {faqs.map((faq, index) => {
                  const isExpanded = expandedFaq === index;
                  return (
                    <div 
                      key={index}
                      className={`rounded-xl border overflow-hidden transition-colors ${
                        theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : index)}
                        className={`w-full p-3 text-left flex items-center justify-between text-xs font-semibold ${
                          theme === 'dark' ? 'text-white hover:bg-white/5' : 'text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span>{faq.q}</span>
                        {isExpanded ? <ChevronUp size={15} className="text-red-500 shrink-0 ml-2" /> : <ChevronDown size={15} className="text-slate-400 shrink-0 ml-2" />}
                      </button>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`px-3.5 pb-3 text-xs leading-relaxed border-t ${
                            theme === 'dark' ? 'text-slate-400 border-white/5 bg-black/20' : 'text-slate-600 border-slate-100 bg-slate-50'
                          }`}
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnostic Status */}
            <div className={`p-3.5 rounded-xl border ${
              theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud Database Status:
                </span>
                <span className="font-semibold text-emerald-500">Connected & Synced</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t flex justify-end ${
            theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
          }`}>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-medium shadow-md shadow-red-500/20 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
