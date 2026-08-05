import React, { useState } from 'react';
import { Project, ProjectLink, ProjectCredential } from '../../types';
import { Plus, X, Link as LinkIcon, ExternalLink, Edit2, Check, Key, Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTheme } from '../../context/ThemeContext';

interface ProjectLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
}

type Tab = 'links' | 'credentials';

export function ProjectLinksModal({ isOpen, onClose, project, onUpdateProject }: ProjectLinksModalProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('links');
  
  useBodyScrollLock(isOpen);
  
  // Links state
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkTitle, setEditLinkTitle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');

  // Credentials state
  const [isAddingCred, setIsAddingCred] = useState(false);
  const [editingCredId, setEditingCredId] = useState<string | null>(null);
  const [credTitle, setCredTitle] = useState('');
  const [credUrl, setCredUrl] = useState('');
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());

  if (!isOpen || !project) return null;

  const links = project.additionalLinks || [];
  const credentials = project.credentials || [];

  // Links handlers
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      let url = newLinkUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const newLinks = [...links, { id: Date.now().toString(), title: newLinkTitle.trim(), url }];
      onUpdateProject(project.id, { additionalLinks: newLinks });
      setNewLinkTitle('');
      setNewLinkUrl('');
    }
  };

  const handleRemoveLink = (id: string) => {
    const newLinks = links.filter(link => link.id !== id);
    onUpdateProject(project.id, { additionalLinks: newLinks });
  };

  const saveEditLink = (id: string) => {
    if (editLinkTitle.trim() && editLinkUrl.trim()) {
      let url = editLinkUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const newLinks = links.map(link => link.id === id ? { ...link, title: editLinkTitle.trim(), url } : link);
      onUpdateProject(project.id, { additionalLinks: newLinks });
      setEditingLinkId(null);
    }
  };

  // Credentials handlers
  const handleAddCred = () => {
    if (credTitle.trim() && credUsername.trim()) {
      const newCred: ProjectCredential = {
        id: crypto.randomUUID(),
        title: credTitle.trim(),
        url: credUrl.trim(),
        username: credUsername.trim(),
        password: credPassword.trim()
      };
      onUpdateProject(project.id, { credentials: [...credentials, newCred] });
      resetCredForm();
    }
  };

  const handleUpdateCred = (id: string) => {
    if (credTitle.trim() && credUsername.trim()) {
      const updatedCreds = credentials.map(c => 
        c.id === id ? { ...c, title: credTitle.trim(), url: credUrl.trim(), username: credUsername.trim(), password: credPassword.trim() } : c
      );
      onUpdateProject(project.id, { credentials: updatedCreds });
      resetCredForm();
    }
  };

  const handleDeleteCred = (id: string) => {
    const updatedCreds = credentials.filter(c => c.id !== id);
    onUpdateProject(project.id, { credentials: updatedCreds });
  };

  const resetCredForm = () => {
    setEditingCredId(null);
    setIsAddingCred(false);
    setCredTitle('');
    setCredUrl('');
    setCredUsername('');
    setCredPassword('');
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
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
            className={`relative rounded-2xl sm:rounded-3xl shadow-2xl border w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] ${
              theme === 'dark' ? 'bg-[#0f172a]/90 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' : 'bg-white/90 backdrop-blur-2xl border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.1)]'
            }`}
          >
            <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
            }`}>
              <div>
                <h2 className={`text-base sm:text-lg font-semibold tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Project Resources</h2>
                <p className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>{project.title}</p>
              </div>
              <button onClick={onClose} className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}>
                <X size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className={`flex p-1 mx-4 sm:mx-6 mt-4 sm:mt-6 rounded-xl border shrink-0 ${
              theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setActiveTab('links')}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'links' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <LinkIcon size={12} className="sm:w-[14px] sm:h-[14px]" />
                <span className="truncate">Links ({links.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'credentials' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Key size={12} className="sm:w-[14px] sm:h-[14px]" />
                <span className="truncate">Access ({credentials.length})</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          {activeTab === 'links' ? (
            <div className="space-y-8">
              <div className="space-y-3">
                {links.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border ${
                    theme === 'dark' ? 'text-gray-500 bg-white/5 border-white/5' : 'text-slate-400 bg-slate-50 border-slate-100'
                  }`}>
                    <LinkIcon className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-sm font-medium">No additional links added yet.</p>
                  </div>
                ) : (
                  links.map((link) => (
                    <div key={link.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-xl group transition-all border ${
                      theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}>
                      {editingLinkId === link.id ? (
                        <div className="flex-1 flex flex-col gap-3">
                          <input 
                            type="text" 
                            value={editLinkTitle}
                            onChange={(e) => setEditLinkTitle(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-sm transition-all ${
                              theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                            placeholder="Link Title"
                            autoFocus
                          />
                          <input 
                            type="text" 
                            value={editLinkUrl}
                            onChange={(e) => setEditLinkUrl(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-xs transition-all ${
                              theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                            placeholder="URL"
                          />
                          <div className="flex justify-end gap-2 mt-1">
                            <button onClick={() => setEditingLinkId(null)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                              theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}>Cancel</button>
                            <button onClick={() => saveEditLink(link.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"><Check size={14} /> Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4 hover:opacity-80 transition-opacity">
                            <div className="p-2 sm:p-2.5 bg-blue-500/10 rounded-lg shrink-0 border border-blue-500/20">
                              <ExternalLink size={14} className="text-blue-400 sm:w-[16px] sm:h-[16px]" />
                            </div>
                            <div className="truncate">
                              <p className={`text-xs sm:text-sm font-medium truncate ${theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>{link.title}</p>
                              <p className={`text-[10px] sm:text-xs truncate mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>{link.url}</p>
                            </div>
                          </a>
                          <div className="flex items-center gap-0.5 sm:gap-1 ml-2 sm:ml-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => { setEditingLinkId(link.id); setEditLinkTitle(link.title); setEditLinkUrl(link.url); }} className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                              theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}><Edit2 size={14} className="sm:w-[16px] sm:h-[16px]" /></button>
                            <button onClick={() => handleRemoveLink(link.id)} className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                              theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}><X size={14} className="sm:w-[16px] sm:h-[16px]" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddLink} className={`pt-6 border-t space-y-4 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                <h3 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Add New Link</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-xs sm:text-sm transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
                    }`}
                    placeholder="Title (e.g. Figma Design)"
                    required
                  />
                  <input 
                    type="text" 
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-xs sm:text-sm transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
                    }`}
                    placeholder="URL (e.g. figma.com/...)"
                    required
                  />
                </div>
                <button type="submit" disabled={!newLinkTitle.trim() || !newLinkUrl.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95">
                  <Plus size={14} className="sm:w-[16px] sm:h-[16px]" /> Add Link
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {!isAddingCred && !editingCredId && (
                <button
                  onClick={() => setIsAddingCred(true)}
                  className={`w-full flex items-center justify-center gap-2 py-3 sm:py-4 border border-dashed rounded-xl transition-all font-medium text-xs sm:text-sm tracking-wide uppercase ${
                    theme === 'dark' ? 'border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>Add New Access Details</span>
                </button>
              )}

              {(isAddingCred || editingCredId) && (
                <div className={`p-4 sm:p-5 border rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200 ${
                  theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Title / Platform</label>
                      <input type="text" value={credTitle} onChange={(e) => setCredTitle(e.target.value)} placeholder="e.g. WordPress Admin" className={`w-full px-3 sm:px-4 py-2 border rounded-xl focus:outline-none focus:border-blue-500/50 text-xs sm:text-sm ${
                        theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`} autoFocus />
                    </div>
                    <div>
                      <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Login URL</label>
                      <input type="url" value={credUrl} onChange={(e) => setCredUrl(e.target.value)} placeholder="https://..." className={`w-full px-3 sm:px-4 py-2 border rounded-xl focus:outline-none focus:border-blue-500/50 text-xs sm:text-sm ${
                        theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`} />
                    </div>
                    <div>
                      <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Username / Email</label>
                      <input type="text" value={credUsername} onChange={(e) => setCredUsername(e.target.value)} placeholder="admin@example.com" className={`w-full px-3 sm:px-4 py-2 border rounded-xl focus:outline-none focus:border-blue-500/50 text-xs sm:text-sm ${
                        theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`} />
                    </div>
                    <div>
                      <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Password</label>
                      <input type="text" value={credPassword} onChange={(e) => setCredPassword(e.target.value)} placeholder="••••••••" className={`w-full px-3 sm:px-4 py-2 border rounded-xl focus:outline-none focus:border-blue-500/50 text-xs sm:text-sm ${
                        theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 sm:gap-3 pt-2">
                    <button onClick={resetCredForm} className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}>Cancel</button>
                    <button onClick={() => editingCredId ? handleUpdateCred(editingCredId) : handleAddCred()} disabled={!credTitle.trim() || !credUsername.trim()} className="px-4 sm:px-5 py-2 text-[10px] sm:text-sm font-bold uppercase tracking-wider bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95">
                      {editingCredId ? 'Save Changes' : 'Add Access'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {credentials.length === 0 && !isAddingCred && (
                  <div className={`col-span-full text-center py-12 rounded-2xl border ${
                    theme === 'dark' ? 'text-gray-500 bg-white/5 border-white/5' : 'text-slate-400 bg-slate-50 border-slate-100'
                  }`}>
                    <Key className="mx-auto mb-3 opacity-30 sm:w-[32px] sm:h-[32px]" size={28} />
                    <p className="text-xs sm:text-sm font-medium">No access details saved yet.</p>
                  </div>
                )}
                {credentials.map(cred => (
                  <div key={cred.id} className={`p-4 sm:p-5 border rounded-2xl group relative transition-all ${
                    theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}>
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <h3 className={`text-sm sm:text-base font-semibold tracking-tight flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>
                        {cred.title}
                        {cred.url && (
                          <a href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                            <ExternalLink size={12} className="sm:w-[14px] sm:h-[14px]" />
                          </a>
                        )}
                      </h3>
                      <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingCredId(cred.id); setCredTitle(cred.title); setCredUrl(cred.url); setCredUsername(cred.username); setCredPassword(cred.password); setIsAddingCred(false); }} className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}><Edit2 size={12} className="sm:w-[14px] sm:h-[14px]" /></button>
                        <button onClick={() => handleDeleteCred(cred.id)} className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}><Trash2 size={12} className="sm:w-[14px] sm:h-[14px]" /></button>
                      </div>
                    </div>
                    <div className="space-y-2.5 sm:space-y-3">
                      <div className={`rounded-lg p-2.5 sm:p-3 border flex justify-between items-center group/field ${
                        theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="overflow-hidden">
                          <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Username</p>
                          <p className={`text-xs sm:text-sm truncate ${theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>{cred.username}</p>
                        </div>
                        <button onClick={() => copyToClipboard(cred.username, `${cred.id}-user`)} className={`p-1.5 sm:p-2 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover/field:opacity-100 ${
                          theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-100 shadow-sm'
                        }`}>
                          {copiedField === `${cred.id}-user` ? <Check size={12} className="text-emerald-500 sm:w-[14px] sm:h-[14px]" /> : <Copy size={12} className="sm:w-[14px] sm:h-[14px]" />}
                        </button>
                      </div>
                      {cred.password && (
                        <div className={`rounded-lg p-2.5 sm:p-3 border flex justify-between items-center group/field ${
                          theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="overflow-hidden">
                            <p className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>Password</p>
                            <p className={`text-xs sm:text-sm font-mono tracking-wider truncate ${theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>
                              {showPasswords.has(cred.id) ? cred.password : '••••••••••••'}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover/field:opacity-100">
                            <button onClick={() => setShowPasswords(prev => { const n = new Set(prev); if (n.has(cred.id)) n.delete(cred.id); else n.add(cred.id); return n; })} className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                              theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-100 shadow-sm'
                            }`}>
                              {showPasswords.has(cred.id) ? <EyeOff size={12} className="sm:w-[14px] sm:h-[14px]" /> : <Eye size={12} className="sm:w-[14px] sm:h-[14px]" />}
                            </button>
                            <button onClick={() => copyToClipboard(cred.password, `${cred.id}-pass`)} className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                              theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-100 shadow-sm'
                            }`}>
                              {copiedField === `${cred.id}-pass` ? <Check size={12} className="text-emerald-500 sm:w-[14px] sm:h-[14px]" /> : <Copy size={12} className="sm:w-[14px] sm:h-[14px]" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
);
}

