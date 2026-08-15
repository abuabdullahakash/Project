import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, ExternalLink, Pin, Search, Tag, Palette, ChevronLeft, ChevronRight, Copy, Check, Settings, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalNotesContext } from '../../context/GlobalNotesContext';
import { GlobalNote } from '../../types';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTheme } from '../../context/ThemeContext';
import { AINotesManager } from '../notes/AINotesManager';

const COLORS = [
  { id: 'default', class: 'bg-white/5 border-white/5 hover:border-white/10' },
  { id: 'red', class: 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' },
  { id: 'blue', class: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50' },
  { id: 'green', class: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' },
  { id: 'yellow', class: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50' },
  { id: 'purple', class: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50' }
];

interface GlobalNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: any) => void;
  initialMode?: 'notes' | 'ai-vault';
}

export function GlobalNotesDrawer({ isOpen, onClose, onNavigate, initialMode = 'notes' }: GlobalNotesDrawerProps) {
  const { theme } = useTheme();
  const { notes, addNote, updateNote, deleteNote, categories, addCategory, editCategory, deleteCategory } = useGlobalNotesContext();
  const [activeTab, setActiveTab] = useState<'notes' | 'ai-vault'>(initialMode);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync initialMode when drawer opens
  useEffect(() => {
    if (isOpen && initialMode) {
      setActiveTab(initialMode);
    }
  }, [isOpen, initialMode]);
  
  // Category management state
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  
  useBodyScrollLock(isOpen);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('General');
  const [color, setColor] = useState('default');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = (note: GlobalNote) => {
    if (!note.content) return;
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyUrl = (e: React.MouseEvent, note: GlobalNote) => {
    e.preventDefault();
    e.stopPropagation();
    if (!note.url) return;
    navigator.clipboard.writeText(note.url);
    setCopiedUrlId(note.id);
    setTimeout(() => setCopiedUrlId(null), 2000);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 150;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const filteredAndSortedNotes = useMemo(() => {
    return [...notes]
      .filter(note => {
        const matchesSearch = 
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (note.url && note.url.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesCategory = selectedCategory === 'All' || (note.category || 'General') === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (a.isPinned === b.isPinned) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.isPinned ? -1 : 1;
      });
  }, [notes, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (title.trim()) {
      addNote({
        title: title.trim(),
        content: content.trim(),
        url: url.trim() || undefined,
        category,
        color,
        isPinned: false
      });
      setTitle('');
      setContent('');
      setUrl('');
      setCategory('General');
      setColor('default');
      setIsAdding(false);
    }
  };

  const handleUpdate = (id: string) => {
    if (title.trim()) {
      updateNote(id, {
        title: title.trim(),
        content: content.trim(),
        url: url.trim() || undefined,
        category,
        color
      });
      setEditingId(null);
      setTitle('');
      setContent('');
      setUrl('');
      setCategory('General');
      setColor('default');
    }
  };

  const startEdit = (note: GlobalNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setUrl(note.url || '');
    setCategory(note.category || 'General');
    setColor(note.color || 'default');
    setIsAdding(false);
    setIsManagingCategories(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setUrl('');
    setCategory('General');
    setColor('default');
  };

  const toggleNoteExpansion = (id: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName);
      setNewCatName('');
    }
  };

  const handleEditCategory = (oldCat: string) => {
    if (editingCatName.trim()) {
      editCategory(oldCat, editingCatName);
      setEditingCat(null);
      setEditingCatName('');
      if (selectedCategory === oldCat) {
        setSelectedCategory(editingCatName.trim());
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative w-full ${
              activeTab === 'ai-vault' 
                ? 'md:w-[95vw] lg:w-[90vw] xl:w-[85vw] max-w-6xl' 
                : 'md:w-1/2 md:max-w-[50vw] max-w-md'
            } h-full shadow-2xl flex flex-col border-l transition-all duration-300 ${
              theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'
            }`}
          >
            {activeTab === 'ai-vault' ? (
              <AINotesManager 
                isEmbedded={true}
                onSwitchToGeneralNotes={() => setActiveTab('notes')}
                onClose={onClose}
              />
            ) : (
              <>
                <div className={`flex flex-wrap sm:flex-nowrap items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0 gap-2 ${
                  theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
                }`}>
                  <h2 className={`text-base sm:text-lg font-semibold tracking-tight items-center gap-2 flex ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {isManagingCategories ? 'Manage Categories' : 'Global Notes & Links'}
                  </h2>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {isManagingCategories ? (
                      <button 
                        onClick={() => setIsManagingCategories(false)}
                        className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                          theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                      >
                        Done
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveTab('ai-vault')}
                          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(99,102,241,0.35)] hover:scale-105 active:scale-95 cursor-pointer"
                          title="Open AI Chat Notes Vault"
                        >
                          <Bot size={14} />
                          <span className="hidden sm:inline">AI Notes Vault</span>
                          <span className="sm:hidden">AI Vault</span>
                        </button>

                        {!isAdding && !editingId && (
                          <button 
                            onClick={() => {
                              setIsAdding(true);
                              setIsManagingCategories(false);
                            }}
                            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95"
                            title="Add New Note / Link"
                          >
                            <Plus size={15} />
                            <span>Add</span>
                          </button>
                        )}
                        <button 
                          onClick={() => setIsManagingCategories(true)}
                          className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                            theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                          title="Manage Categories"
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          onClick={onClose}
                          className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                            theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                          title="Close"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
              {isManagingCategories ? (
                <div className="space-y-6">
                  {/* Add new category */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Add Category</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="New category name..."
                        className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 transition-all text-sm ${
                          theme === 'dark'
                            ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                            : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCategory();
                        }}
                      />
                      <button
                        onClick={handleAddCategory}
                        disabled={!newCatName.trim() || categories.includes(newCatName.trim())}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all hover:scale-105 active:scale-95"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Existing Categories</label>
                    {categories.map((cat) => (
                      <div key={cat} className={`flex items-center justify-between p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#0f172a]/90 backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' : 'bg-white/90 backdrop-blur-2xl border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.1)]'}`}>
                        {editingCat === cat ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className={`flex-1 px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-1 transition-all text-sm ${
                                theme === 'dark'
                                  ? 'bg-black/50 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                              }`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditCategory(cat);
                                if (e.key === 'Escape') setEditingCat(null);
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditCategory(cat)}
                              disabled={!editingCatName.trim() || editingCatName.trim() === cat}
                              className={`p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50`}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingCat(null)}
                              className={`p-1.5 rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'} transition-colors`}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{cat}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingCat(cat);
                                  setEditingCatName(cat);
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                title="Edit Category"
                              >
                                <Edit2 size={14} />
                              </button>
                              {cat !== 'General' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete "${cat}"? Notes in this category will be moved to "General".`)) {
                                      deleteCategory(cat);
                                      if (selectedCategory === cat) setSelectedCategory('All');
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                  title="Delete Category"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
              <>
          {/* Search and Filter Section */}
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`} size={16} />
              <input
                type="text"
                placeholder="Search notes & links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
            </div>
            
            <div className="relative flex items-center">
              {/* Left Arrow with Gradient */}
              <div className={`absolute left-0 z-10 h-full flex items-center pr-4 bg-gradient-to-r to-transparent ${
                theme === 'dark' ? 'from-[#020617] via-[#020617]' : 'from-white via-white'
              }`}>
                <button
                  onClick={() => scroll('left')}
                  className={`p-1 rounded-full transition-all border ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/10' 
                      : 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  }`}
                  title="Previous"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              <div 
                ref={scrollContainerRef}
                className={`flex gap-6 border-b overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full px-8 ${
                  theme === 'dark' ? 'border-white/10' : 'border-slate-200'
                }`}
              >
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    selectedCategory === 'All' 
                      ? 'border-blue-500 text-blue-600' 
                      : theme === 'dark'
                        ? 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                      selectedCategory === cat 
                        ? 'border-blue-500 text-blue-600' 
                        : theme === 'dark'
                          ? 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Right Arrow with Gradient */}
              <div className={`absolute right-0 z-10 h-full flex items-center pl-4 bg-gradient-to-l to-transparent ${
                theme === 'dark' ? 'from-[#020617] via-[#020617]' : 'from-white via-white'
              }`}>
                <button
                  onClick={() => scroll('right')}
                  className={`p-1 rounded-full transition-all border ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/10' 
                      : 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  }`}
                  title="Next"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {(isAdding || editingId) && (
            <div className={`mb-8 p-5 border rounded-2xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-200 ${
              theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. WordPress Snippets"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-sm ${
                    theme === 'dark'
                      ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  autoFocus
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>URL (Optional)</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-sm ${
                    theme === 'dark'
                      ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Note Content (Optional)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add your notes here..."
                  rows={4}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-sm resize-none ${
                    theme === 'dark'
                      ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50'
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    <Tag size={12} /> Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-1 transition-all text-sm appearance-none ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                    <Palette size={12} /> Color
                  </label>
                  <div className="flex items-center gap-2 h-[42px] px-2">
                    {COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setColor(c.id)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          color === c.id ? (theme === 'dark' ? 'border-white scale-110' : 'border-gray-900 scale-110') : 'border-transparent hover:scale-110'
                        } ${c.class.split(' ')[0]}`}
                        title={c.id}
                        type="button"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    cancelEdit();
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                  disabled={!title.trim()}
                  className="px-5 py-2 text-sm font-bold uppercase tracking-wider bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:scale-105 active:scale-95"
                >
                  {editingId ? 'Save Changes' : 'Add Note'}
                </button>
              </div>
            </div>
          )}

          <div className="columns-1 md:columns-2 gap-4">
            {filteredAndSortedNotes.map(note => {
              const noteColor = COLORS.find(c => c.id === (note.color || 'default')) || COLORS[0];
              
              return (
              <div key={note.id} className={`break-inside-avoid mb-4 p-5 border rounded-2xl group relative transition-all ${
                theme === 'dark' ? noteColor.class : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              } ${note.isPinned ? 'shadow-[0_0_15px_rgba(255,255,255,0.05)]' : ''}`}>
                {note.isPinned && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1.5 rounded-full shadow-lg shadow-blue-500/30">
                    <Pin size={12} className="fill-current" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className={`font-semibold pr-8 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{note.title}</h3>
                    {(note.category || 'General') !== 'General' && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md border ${
                        theme === 'dark' ? 'bg-black/30 text-gray-300 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {note.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {note.content && (
                      <button
                        onClick={() => handleCopy(note)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          copiedId === note.id 
                            ? 'text-green-500 bg-green-500/10' 
                            : theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title="Copy Content"
                      >
                        {copiedId === note.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => updateNote(note.id, { isPinned: !note.isPinned })}
                      className={`p-1.5 rounded-lg transition-colors ${
                        note.isPinned 
                          ? 'text-blue-400 hover:bg-blue-500/10' 
                          : theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title={note.isPinned ? "Unpin Note" : "Pin Note"}
                    >
                      <Pin size={14} className={note.isPinned ? "fill-current" : ""} />
                    </button>
                    <button
                      onClick={() => startEdit(note)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {note.url && (
                  <div className="relative group/url flex items-center mb-3">
                    <a 
                      href={note.url.startsWith('http') ? note.url : `https://${note.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors w-full ${
                        theme === 'dark' 
                          ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10 border-blue-500/20' 
                          : 'text-blue-600 hover:text-blue-700 bg-blue-50 border-blue-100'
                      }`}
                    >
                      <ExternalLink size={14} className="shrink-0" />
                      <span className="truncate font-medium">{note.url}</span>
                    </a>
                    <button
                      onClick={(e) => handleCopyUrl(e, note)}
                      className={`absolute right-2 opacity-0 group-hover/url:opacity-100 p-1.5 rounded-lg transition-all ${
                        copiedUrlId === note.id 
                          ? 'text-green-500 bg-green-500/10' 
                          : theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Copy Link"
                    >
                      {copiedUrlId === note.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
                
                {note.content && (
                  <div className="mt-2">
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                      theme === 'dark' ? 'text-gray-400' : 'text-slate-600'
                    } ${!expandedNotes.has(note.id) ? 'line-clamp-2' : ''}`}>
                      {note.content}
                    </p>
                    {note.content.split('\n').length > 2 || note.content.length > 100 ? (
                      <button
                        onClick={() => toggleNoteExpansion(note.id)}
                        className="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                      >
                        {expandedNotes.has(note.id) ? 'Show Less' : 'Read More'}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredAndSortedNotes.length === 0 && !isAdding && (
            <div className={`text-center py-12 rounded-2xl border ${
              theme === 'dark' ? 'text-gray-500 bg-white/5 border-white/5' : 'text-slate-400 bg-slate-50 border-slate-200'
            }`}>
              <p className="font-medium">No notes or links found.</p>
              <p className="text-sm mt-2 opacity-70">
                {searchQuery || selectedCategory !== 'All' 
                  ? "Try adjusting your search or filters." 
                  : "Click the button above to add one."}
              </p>
            </div>
          )}
        </div>
      </>
    )}
  </div>
</>
)}
</motion.div>
</div>
)}
</AnimatePresence>
);
}
