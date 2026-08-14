import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Moon, Sun, Volume2, VolumeX, Sparkles, Database, Check, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSettingsModal({ isOpen, onClose }: AppSettingsModalProps) {
  const { theme, toggleTheme } = useTheme();
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('projecthub_sound_enabled') !== 'false';
  });
  
  const [compactMode, setCompactMode] = useState(() => {
    return localStorage.getItem('projecthub_compact_mode') === 'true';
  });

  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    return localStorage.getItem('projecthub_animations') !== 'false';
  });

  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('projecthub_sound_enabled', String(next));
    toast.success(next ? 'Sound notifications enabled' : 'Sound notifications muted');
  };

  const handleCompactToggle = () => {
    const next = !compactMode;
    setCompactMode(next);
    localStorage.setItem('projecthub_compact_mode', String(next));
    toast.success(next ? 'Compact view mode enabled' : 'Comfortable view mode enabled');
  };

  const handleAnimationsToggle = () => {
    const next = !animationsEnabled;
    setAnimationsEnabled(next);
    localStorage.setItem('projecthub_animations', String(next));
    toast.success(next ? 'UI animations enabled' : 'Reduced motion mode enabled');
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      // Clear temporary local storage keys while preserving auth
      const authKeys = ['firebase:authUser', 'theme'];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !authKeys.some(k => key.includes(k))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      toast.success('App cache and local temporary state refreshed!');
    } catch (e) {
      toast.error('Failed to clear cache.');
    } finally {
      setIsClearingCache(false);
    }
  };

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
        
        {/* Modal Window */}
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
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                <Settings size={20} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  App Settings & Preferences
                </h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Customize your ProjectHub workspace experience
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
            {/* Appearance Section */}
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Appearance & Theme
              </h3>
              <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2.5 rounded-xl shrink-0 ${theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-600'}`}>
                    {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Theme Mode:
                      </p>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold capitalize ${
                        theme === 'dark' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {theme}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Toggle between Obsidian Dark & Clean Light interfaces
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-full sm:w-auto shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white border-white/15 active:scale-95 shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 active:scale-95 shadow-sm'
                  }`}
                >
                  {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-blue-600" />}
                  <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </div>
            </div>

            {/* General Preferences */}
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                System & Interactions
              </h3>
              <div className="space-y-2.5">
                {/* Audio feedback */}
                <div className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl shrink-0 ${soundEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Sound Alerts & Audio Cues
                      </p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Play subtle audio chimes for new notifications & tasks
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSoundToggle}
                    aria-label="Toggle sound alerts"
                    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                      soundEnabled ? 'bg-red-500' : theme === 'dark' ? 'bg-white/20' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Compact Mode */}
                <div className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl shrink-0 bg-blue-500/10 text-blue-400">
                      <Sparkles size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Compact Layout Density
                      </p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Display more items per screen with reduced padding
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCompactToggle}
                    aria-label="Toggle compact layout"
                    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                      compactMode ? 'bg-red-500' : theme === 'dark' ? 'bg-white/20' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      compactMode ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Motion Animations */}
                <div className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl shrink-0 bg-purple-500/10 text-purple-400">
                      <Sparkles size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Smooth Motion Animations
                      </p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Page transitions and interactive spring physics
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleAnimationsToggle}
                    aria-label="Toggle motion animations"
                    className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${
                      animationsEnabled ? 'bg-red-500' : theme === 'dark' ? 'bg-white/20' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      animationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Storage & Cache */}
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Storage & Cache
              </h3>
              <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 rounded-xl shrink-0 bg-emerald-500/10 text-emerald-400">
                    <Database size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Local Cache & Temporary Storage
                    </p>
                    <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Clear cached assets if experiencing sync delays
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                  className={`w-full sm:w-auto shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    theme === 'dark'
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/25 active:scale-95'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 active:scale-95'
                  }`}
                >
                  <RefreshCw size={14} className={isClearingCache ? 'animate-spin' : ''} />
                  <span>Clear Cache</span>
                </button>
              </div>
            </div>

            {/* Build & Version Info */}
            <div className={`p-3 rounded-xl border text-center ${
              theme === 'dark' ? 'bg-black/20 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <p className="text-xs font-semibold">ProjectHub Premium v2.0</p>
              <p className="text-[10px] mt-0.5 opacity-80">Cloud Connected • Real-time Sync Active</p>
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
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
