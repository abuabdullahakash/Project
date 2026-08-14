import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, EyeOff, Copy, Check, ChevronDown, 
  ExternalLink, Edit3, Trash2, Globe, Shield, Lock, Clock
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  passwordEncrypted: string;
  url: string;
  category: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface PasswordAccordionItemProps {
  entry: PasswordEntry;
  decryptedPassword: string;
  theme: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (entry: PasswordEntry) => void;
  onDelete: (id: string) => void;
  getPasswordStrength: (pass: string) => { score: number; label: string; color: string };
}

export const PasswordAccordionItem: React.FC<PasswordAccordionItemProps> = ({
  entry,
  decryptedPassword,
  theme,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  getPasswordStrength,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedType, setCopiedType] = useState<'username' | 'password' | 'quick' | null>(null);

  const strength = getPasswordStrength(decryptedPassword);

  const handleCopy = (e: React.MouseEvent, text: string, type: 'username' | 'password' | 'quick') => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getCategoryColor = (category: string) => {
    switch ((category || '').toLowerCase()) {
      case 'social':
        return theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'email':
        return theme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200';
      case 'work':
        return theme === 'dark' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200';
      case 'financial':
        return theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default:
        return theme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? theme === 'dark'
            ? 'bg-slate-900/95 border-red-500/30 shadow-xl ring-1 ring-red-500/20'
            : 'bg-white border-red-500/30 shadow-lg ring-1 ring-red-500/20'
          : theme === 'dark'
          ? 'bg-slate-900/60 hover:bg-slate-900 border-white/5 hover:border-white/10 shadow-sm'
          : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300 shadow-sm'
      }`}
    >
      {/* Accordion Row Header */}
      <div
        onClick={onToggleExpand}
        className="p-3.5 sm:p-4.5 cursor-pointer flex items-center justify-between gap-3 select-none"
      >
        {/* Left: Brand Logo & Titles */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <BrandLogo title={entry.title} url={entry.url} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm sm:text-base font-bold truncate ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {entry.title}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryColor(entry.category)}`}>
                {entry.category || 'General'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <p className={`text-xs truncate max-w-[200px] sm:max-w-xs font-mono ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {entry.username}
              </p>
              {entry.url && (
                <span className={`hidden md:inline-flex items-center gap-1 text-[11px] truncate max-w-[180px] ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  • {entry.url.replace(/^https?:\/\//, '')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Copy & Expand Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Copy Password Icon Button */}
          <button
            type="button"
            onClick={(e) => handleCopy(e, decryptedPassword, 'quick')}
            title="Quick Copy Password"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              copiedType === 'quick'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {copiedType === 'quick' ? <Check size={13} className="text-white" /> : <Copy size={13} />}
            <span className="text-[11px]">{copiedType === 'quick' ? 'Copied' : 'Copy Pass'}</span>
          </button>

          {/* Expand / Collapse Chevron */}
          <div
            className={`p-2 rounded-xl transition-transform duration-300 ${
              isExpanded 
                ? 'rotate-180 bg-red-500/10 text-red-500' 
                : theme === 'dark' ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-inherit"
          >
            <div className={`p-4 sm:p-5 space-y-4 ${
              theme === 'dark' ? 'bg-black/20' : 'bg-slate-50/70'
            }`}>
              
              {/* Credentials Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                
                {/* 1. Username/Email Card */}
                <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
                  theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Username / Email
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-mono text-xs sm:text-sm font-semibold truncate select-all ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {entry.username}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, entry.username, 'username')}
                      className={`p-1.5 rounded-lg text-xs transition-all shrink-0 ${
                        copiedType === 'username'
                          ? 'bg-emerald-500 text-white'
                          : theme === 'dark'
                          ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                          : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                      title="Copy Username"
                    >
                      {copiedType === 'username' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* 2. Password Card with Mask Toggle & Strength */}
                <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
                  theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Secure Password
                    </span>
                    {showPassword && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Strength: <span className="text-amber-500">{strength.label}</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-mono text-xs sm:text-sm font-semibold truncate select-all ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {showPassword ? (decryptedPassword || '••••••••') : '••••••••••••••••'}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPassword(prev => !prev);
                        }}
                        className={`p-1.5 rounded-lg text-xs transition-all ${
                          theme === 'dark'
                            ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                            : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, decryptedPassword, 'password')}
                        className={`p-1.5 rounded-lg text-xs transition-all ${
                          copiedType === 'password'
                            ? 'bg-emerald-500 text-white'
                            : theme === 'dark'
                            ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                            : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                        title="Copy Password"
                      >
                        {copiedType === 'password' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Progress Bar */}
                  {showPassword && (
                    <div className="h-1 bg-slate-700/40 rounded-full overflow-hidden mt-0.5">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.score / 6) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Website URL link row */}
              {entry.url && (
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Globe size={15} className="text-slate-400 shrink-0" />
                    <span className={`text-xs truncate font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {entry.url}
                    </span>
                  </div>
                  <a
                    href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-400 shrink-0"
                  >
                    <span>Launch</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Notes / Recovery hints */}
              {entry.notes && (
                <div className={`p-3.5 rounded-xl border ${
                  theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/90' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
                    Notes & Recovery Hints
                  </p>
                  <p className="text-xs italic leading-relaxed whitespace-pre-wrap">
                    "{entry.notes}"
                  </p>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2 border-t border-inherit">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock size={12} />
                  <span>Last updated: {new Date(entry.updatedAt || entry.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                    }`}
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
