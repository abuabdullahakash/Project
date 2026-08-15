import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Plus, Search, Filter, Trash2, Edit, ExternalLink, FileText, Check, 
  ChevronLeft, ChevronRight, Sparkles, Mail, Layers, X, HelpCircle, 
  Copy, FolderPlus, Tag, Settings, Eye, CheckCircle, Clock, Link as LinkIcon,
  Code, Bookmark, Share2, MessageSquare, Terminal, RefreshCw, ArrowLeft,
  LayoutGrid, List
} from 'lucide-react';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { AINote, AICategory } from '../../types';

// Firebase Operation types for error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Database Error during ${operationType}: Please check console.`);
  throw new Error(JSON.stringify(errInfo));
}

const AI_PROVIDERS = [
  'Google AI Studio',
  'ChatGPT',
  'Claude',
  'Gemini',
  'DeepSeek',
  'Perplexity',
  'Grok',
  'Qwen',
  'Other'
];

const NOTE_TYPES = [
  'NOTES',
  'PROMPTS',
  'CODE',
  'SUGGESTIONS',
  'SOLUTION',
  'BUG FIX',
  'RESEARCH',
  'CHEATSHEET'
];

const DEFAULT_CATEGORIES = [
  'General',
  'Web Development',
  'React & UI',
  'Backend & APIs',
  'Python & AI',
  'Research & Study',
  'Prompt Engineering'
];

interface AINotesManagerProps {
  onBack?: () => void;
  isEmbedded?: boolean;
  onSwitchToGeneralNotes?: () => void;
  onClose?: () => void;
}

export function AINotesManager({ onBack, isEmbedded, onSwitchToGeneralNotes, onClose }: AINotesManagerProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [notes, setNotes] = useState<AINote[]>([]);
  const [categories, setCategories] = useState<AICategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'grid'>('auto');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [activeViewNote, setActiveViewNote] = useState<AINote | null>(null);
  const [editingNote, setEditingNote] = useState<AINote | null>(null);

  // Copy feedbacks
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<boolean>(false);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    chatTitle: '',
    aiProvider: 'Google AI Studio',
    customProvider: '',
    category: 'General',
    type: 'NOTES',
    gmail: user?.email || '',
    notes: '',
    aiResponse: '',
    chatLink: '',
    questionCount: 1,
    additionalLinks: [] as { title: string; url: string }[],
  });

  // Category Manager Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Horizontal scroll ref for category tabs
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch AI Notes from Firestore
  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'aiNotes'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedNotes: AINote[] = [];
        snapshot.forEach((docSnap) => {
          fetchedNotes.push({ id: docSnap.id, ...(docSnap.data() as Omit<AINote, 'id'>) });
        });
        // Sort descending by createdAt
        fetchedNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotes(fetchedNotes);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'aiNotes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Fetch AI Categories from Firestore
  useEffect(() => {
    if (!user) {
      setCategories([]);
      return;
    }

    const q = query(
      collection(db, 'aiCategories'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCategories: AICategory[] = [];
        snapshot.forEach((docSnap) => {
          fetchedCategories.push({ id: docSnap.id, ...(docSnap.data() as Omit<AICategory, 'id'>) });
        });
        
        if (fetchedCategories.length === 0) {
          // Initialize with default categories if empty
          initializeDefaultCategories();
        } else {
          fetchedCategories.sort((a, b) => a.name.localeCompare(b.name));
          setCategories(fetchedCategories);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'aiCategories');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Helper to initialize default categories
  const initializeDefaultCategories = async () => {
    if (!user) return;
    try {
      for (const catName of DEFAULT_CATEGORIES) {
        const now = new Date().toISOString();
        await addDoc(collection(db, 'aiCategories'), {
          userId: user.uid,
          name: catName,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (e) {
      console.warn('Could not auto-seed default categories:', e);
    }
  };

  // Scroll categories tabs
  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Category filter
      if (selectedCategory !== 'All' && n.category !== selectedCategory) {
        return false;
      }
      // Provider filter
      if (selectedProvider !== 'All' && n.aiProvider !== selectedProvider) {
        return false;
      }
      // Type filter
      if (selectedType !== 'All' && n.type !== selectedType) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (n.chatTitle || '').toLowerCase().includes(q);
        const inNotes = (n.notes || '').toLowerCase().includes(q);
        const inProvider = (n.aiProvider || '').toLowerCase().includes(q);
        const inCategory = (n.category || '').toLowerCase().includes(q);
        const inType = (n.type || '').toLowerCase().includes(q);
        const inGmail = (n.gmail || '').toLowerCase().includes(q);
        const inResponse = (n.aiResponse || '').toLowerCase().includes(q);
        return inTitle || inNotes || inProvider || inCategory || inType || inGmail || inResponse;
      }
      return true;
    });
  }, [notes, selectedCategory, selectedProvider, selectedType, searchQuery]);

  // Note counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: notes.length };
    notes.forEach((n) => {
      const cat = n.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [notes]);

  // Open modal for Create
  const handleOpenAddModal = (presetCategory?: string) => {
    setEditingNote(null);
    setFormData({
      chatTitle: '',
      aiProvider: 'Google AI Studio',
      customProvider: '',
      category: presetCategory || (selectedCategory !== 'All' ? selectedCategory : categories[0]?.name || 'General'),
      type: 'NOTES',
      gmail: user?.email || '',
      notes: '',
      aiResponse: '',
      chatLink: '',
      questionCount: 1,
      additionalLinks: [],
    });
    setIsAddModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (note: AINote) => {
    setEditingNote(note);
    const isStandardProvider = AI_PROVIDERS.includes(note.aiProvider);
    setFormData({
      chatTitle: note.chatTitle || '',
      aiProvider: isStandardProvider ? note.aiProvider : 'Other',
      customProvider: isStandardProvider ? '' : note.aiProvider,
      category: note.category || 'General',
      type: note.type || 'NOTES',
      gmail: note.gmail || user?.email || '',
      notes: note.notes || '',
      aiResponse: note.aiResponse || '',
      chatLink: note.chatLink || '',
      questionCount: note.questionCount || 1,
      additionalLinks: note.additionalLinks ? [...note.additionalLinks] : [],
    });
    setIsAddModalOpen(true);
  };

  // Save Note (Create or Update)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be signed in to save notes.');
      return;
    }

    if (!formData.chatTitle.trim()) {
      toast.error('Please enter a chat title.');
      return;
    }

    if (!formData.notes.trim()) {
      toast.error('Please provide note content / question details.');
      return;
    }

    const providerToSave = formData.aiProvider === 'Other' 
      ? (formData.customProvider.trim() || 'Custom AI')
      : formData.aiProvider;

    const now = new Date().toISOString();

    try {
      if (editingNote) {
        // Update
        const noteDocRef = doc(db, 'aiNotes', editingNote.id);
        await updateDoc(noteDocRef, {
          chatTitle: formData.chatTitle.trim(),
          aiProvider: providerToSave,
          category: formData.category || 'General',
          type: formData.type || 'NOTES',
          gmail: formData.gmail.trim() || user.email || '',
          notes: formData.notes.trim(),
          aiResponse: formData.aiResponse.trim() || '',
          chatLink: formData.chatLink.trim() || '',
          questionCount: Number(formData.questionCount) || 1,
          additionalLinks: formData.additionalLinks,
          updatedAt: now,
        });
        toast.success('AI Note updated successfully!');
      } else {
        // Create
        await addDoc(collection(db, 'aiNotes'), {
          userId: user.uid,
          chatTitle: formData.chatTitle.trim(),
          aiProvider: providerToSave,
          category: formData.category || 'General',
          type: formData.type || 'NOTES',
          gmail: formData.gmail.trim() || user.email || '',
          notes: formData.notes.trim(),
          aiResponse: formData.aiResponse.trim() || '',
          chatLink: formData.chatLink.trim() || '',
          questionCount: Number(formData.questionCount) || 1,
          additionalLinks: formData.additionalLinks,
          createdAt: now,
          updatedAt: now,
        });
        toast.success('New AI Note saved to vault!');
      }

      setIsAddModalOpen(false);
      setEditingNote(null);
    } catch (error) {
      handleFirestoreError(error, editingNote ? OperationType.UPDATE : OperationType.CREATE, 'aiNotes');
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this AI note? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'aiNotes', id));
      toast.success('AI Note deleted.');
      if (activeViewNote?.id === id) {
        setActiveViewNote(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `aiNotes/${id}`);
    }
  };

  // Copy Chat Title
  const handleCopyChatTitle = (titleText: string, noteId: string) => {
    navigator.clipboard.writeText(titleText);
    setCopiedId(noteId);
    toast.success('Chat Title copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy AI Code / Response
  const handleCopyAIResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(true);
    toast.success('AI response copied!');
    setTimeout(() => setCopiedCodeId(false), 2000);
  };

  // Category Management Handlers
  const handleCreateCategory = async () => {
    if (!user) return;
    const name = newCategoryName.trim();
    if (!name) {
      toast.error('Please enter a category name.');
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists.');
      return;
    }

    const now = new Date().toISOString();
    try {
      await addDoc(collection(db, 'aiCategories'), {
        userId: user.uid,
        name,
        createdAt: now,
        updatedAt: now,
      });
      setNewCategoryName('');
      toast.success(`Category "${name}" created.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'aiCategories');
    }
  };

  const handleUpdateCategory = async (cat: AICategory) => {
    if (!user) return;
    const newName = editingCategoryName.trim();
    if (!newName) {
      toast.error('Category name cannot be empty.');
      return;
    }

    if (newName === cat.name) {
      setEditingCategoryId(null);
      return;
    }

    try {
      const catRef = doc(db, 'aiCategories', cat.id);
      await updateDoc(catRef, {
        name: newName,
        updatedAt: new Date().toISOString(),
      });

      // Update existing notes in this category
      const notesToUpdate = notes.filter((n) => n.category === cat.name);
      for (const n of notesToUpdate) {
        await updateDoc(doc(db, 'aiNotes', n.id), {
          category: newName,
          updatedAt: new Date().toISOString(),
        });
      }

      setEditingCategoryId(null);
      setEditingCategoryName('');
      toast.success(`Category renamed to "${newName}".`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `aiCategories/${cat.id}`);
    }
  };

  const handleDeleteCategory = async (cat: AICategory) => {
    if (cat.name === 'General') {
      toast.error('The default "General" category cannot be deleted.');
      return;
    }

    if (!window.confirm(`Delete category "${cat.name}"? Notes under this category will be moved to "General".`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'aiCategories', cat.id));

      // Move notes under this category to "General"
      const notesToMigrate = notes.filter((n) => n.category === cat.name);
      for (const n of notesToMigrate) {
        await updateDoc(doc(db, 'aiNotes', n.id), {
          category: 'General',
          updatedAt: new Date().toISOString(),
        });
      }

      if (selectedCategory === cat.name) {
        setSelectedCategory('All');
      }

      toast.success(`Category deleted. Associated notes moved to "General".`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `aiCategories/${cat.id}`);
    }
  };

  // Helper Provider Badge Styles
  const getProviderBadgeClass = (provider: string) => {
    switch (provider) {
      case 'ChatGPT':
        return theme === 'dark'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'Gemini':
        return theme === 'dark'
          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          : 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
      case 'Google AI Studio':
        return theme === 'dark'
          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
      case 'Claude':
        return theme === 'dark'
          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
          : 'bg-orange-50 text-orange-700 border-orange-200 font-bold';
      case 'DeepSeek':
        return theme === 'dark'
          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
          : 'bg-cyan-50 text-cyan-700 border-cyan-200 font-bold';
      case 'Perplexity':
        return theme === 'dark'
          ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
          : 'bg-teal-50 text-teal-700 border-teal-200 font-bold';
      default:
        return theme === 'dark'
          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
          : 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
    }
  };

  // Helper Type Badge Styles
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'PROMPTS':
        return theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CODE':
        return theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SUGGESTIONS':
        return theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SOLUTION':
        return theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'BUG FIX':
        return theme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RESEARCH':
        return theme === 'dark' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return theme === 'dark' ? 'bg-slate-500/10 text-slate-300 border-slate-500/20' : 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className={`transition-colors duration-200 flex flex-col flex-1 ${
      isEmbedded 
        ? 'w-full h-full' 
        : `min-h-screen pb-16 ${theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'}`
    }`}>
      {/* ================= TOP HEADER ================= */}
      <div className={`shrink-0 border-b backdrop-blur-md transition-colors ${
        isEmbedded 
          ? theme === 'dark' ? 'bg-white/[0.02] border-white/5 px-3 sm:px-6 py-3 sm:py-4' : 'bg-slate-50 border-slate-200 px-3 sm:px-6 py-3 sm:py-4'
          : `sticky top-0 z-30 ${theme === 'dark' ? 'bg-[#0f172a]/90 border-white/10' : 'bg-white/90 border-slate-200'} px-3 sm:px-6 lg:px-8 py-3 sm:py-4`
      }`}>
        <div className={`${isEmbedded ? 'w-full' : 'max-w-7xl mx-auto'}`}>
          {/* Mobile & Tablet Header Layout */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            
            {/* Row 1: Back/Switch + Title + (Close Button on right for mobile/tablet) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {onSwitchToGeneralNotes ? (
                  <button
                    onClick={onSwitchToGeneralNotes}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                      theme === 'dark' 
                        ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30' 
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                    }`}
                    title="Switch back to General Notes & Links"
                  >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline">General Notes</span>
                    <span className="sm:hidden">Notes</span>
                  </button>
                ) : onBack ? (
                  <button
                    onClick={onBack}
                    className={`p-1.5 sm:p-2 rounded-xl border transition-all shrink-0 ${
                      theme === 'dark' 
                        ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
                    }`}
                    title="Go Back"
                  >
                    <ArrowLeft size={16} />
                  </button>
                ) : null}

                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                  <Bot size={18} className="text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h1 className={`text-sm sm:text-base md:text-lg font-bold tracking-tight truncate ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      AI Chat Notes Vault
                    </h1>
                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Table View
                    </span>
                  </div>
                  <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} hidden md:block truncate`}>
                    Save and organize your AI conversations, prompts, and code solutions category-wise
                  </p>
                </div>
              </div>

              {/* Action Buttons (On Desktop: in line; On Mobile: close button stays top right) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Desktop/Tablet Action Buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                      theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
                        : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                    title="Manage Categories"
                  >
                    <Settings size={14} />
                    <span>Categories</span>
                  </button>

                  <button
                    onClick={() => handleOpenAddModal()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-95 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Add Note</span>
                  </button>
                </div>

                {isEmbedded && onClose && (
                  <button
                    onClick={onClose}
                    className={`p-1.5 sm:p-2 rounded-xl transition-all ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title="Close Vault"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2 on Mobile screens: Categories & Add Note buttons */}
            <div className="grid grid-cols-2 gap-2 sm:hidden pt-0.5">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm'
                }`}
              >
                <Settings size={13} />
                <span>Categories</span>
              </button>

              <button
                onClick={() => handleOpenAddModal()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/30 active:scale-95"
              >
                <Plus size={14} />
                <span>Add Note</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ================= MAIN CONTAINER ================= */}
      <div className={`flex-1 overflow-y-auto space-y-4 sm:space-y-5 ${
        isEmbedded ? 'p-3 sm:p-5 lg:p-6' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6'
      }`}>

        {/* Search & Category Pills Filter Bar */}
        <div className={`p-3 sm:p-4 md:p-5 rounded-2xl border transition-all ${
          theme === 'dark' 
            ? 'bg-[#111827] border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3 md:gap-4 justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`} size={15} />
              <input
                type="text"
                placeholder="Search notes, titles, providers, gmail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-xs sm:text-sm ${
                  theme === 'dark'
                    ? 'bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Filters for Provider & Type (2-column on mobile, inline on tablet/desktop) */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
              {/* Provider Select */}
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className={`w-full sm:w-auto px-2.5 sm:px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none transition-all truncate ${
                  theme === 'dark'
                    ? 'bg-black/40 border-white/10 text-slate-300 focus:border-indigo-500/50'
                    : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-indigo-500'
                }`}
              >
                <option value="All">All Providers</option>
                {AI_PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Type Select */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={`w-full sm:w-auto px-2.5 sm:px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none transition-all truncate ${
                  theme === 'dark'
                    ? 'bg-black/40 border-white/10 text-slate-300 focus:border-indigo-500/50'
                    : 'bg-slate-50 border-slate-300 text-slate-700 focus:border-indigo-500'
                }`}
              >
                <option value="All">All Types</option>
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Category Tabs Scroll Bar */}
          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 relative flex items-center">
            {/* Scroll Left Button */}
            <button
              onClick={() => scrollTabs('left')}
              className={`p-1.5 rounded-lg border mr-1.5 shrink-0 transition-all hidden sm:flex ${
                theme === 'dark'
                  ? 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
              title="Scroll Left"
            >
              <ChevronLeft size={13} />
            </button>

            {/* Categories Carousel */}
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1 flex-1 touch-pan-x"
            >
              {/* All Notes Tab */}
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                  selectedCategory === 'All'
                    ? theme === 'dark'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                      : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                    : theme === 'dark'
                      ? 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border-white/5'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <Layers size={12} />
                <span>All Notes</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedCategory === 'All' ? 'bg-white/20 text-white' : 'bg-black/20 text-slate-400'
                }`}>
                  {categoryCounts['All'] || 0}
                </span>
              </button>

              {/* Dynamic Categories */}
              {categories.map((cat) => {
                const count = categoryCounts[cat.name] || 0;
                const isSelected = selectedCategory === cat.name;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                      isSelected
                        ? theme === 'dark'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                          : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                        : theme === 'dark'
                          ? 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 border-white/5'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    <Tag size={11} />
                    <span>{cat.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-black/20 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              onClick={() => scrollTabs('right')}
              className={`p-1.5 rounded-lg border ml-1.5 shrink-0 transition-all hidden sm:flex ${
                theme === 'dark'
                  ? 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
              title="Scroll Right"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* ================= AI NOTES TABLE / LIST ================= */}
        <div className={`border rounded-2xl overflow-hidden transition-all ${
          theme === 'dark' 
            ? 'bg-[#111827] border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.35)]' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Table Header Top Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/50 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <span>Notes ({filteredNotes.length})</span>
              </span>
              {selectedCategory !== 'All' && (
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {selectedCategory}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {searchQuery && (
                <span className="text-[10px] sm:text-[11px] bg-slate-500/10 text-slate-400 px-2 sm:px-2.5 py-1 rounded-lg font-medium">
                  "{searchQuery}"
                </span>
              )}

              {/* View Layout Switcher (Auto / Table / Cards) */}
              <div className={`flex items-center p-0.5 rounded-lg border text-xs ${
                theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setViewMode('auto')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                    viewMode === 'auto'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Auto Responsive View"
                >
                  Auto
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1 sm:px-2 sm:py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'table'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table View"
                >
                  <List size={13} />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 sm:px-2 sm:py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid size={13} />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <RefreshCw className="mx-auto text-indigo-500 animate-spin mb-3" size={32} />
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Loading your AI notes vault...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredNotes.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                theme === 'dark' ? 'bg-white/5 text-slate-400 border border-white/10' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                <Bot size={32} className="text-indigo-500" />
              </div>
              <h3 className={`text-base font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                No AI Notes Found
              </h3>
              <p className={`text-xs max-w-md mx-auto mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {searchQuery || selectedCategory !== 'All' || selectedProvider !== 'All' || selectedType !== 'All'
                  ? 'No notes match your active search or filter criteria. Try resetting filters.'
                  : 'Start capturing your AI conversations, prompts, questions, and solutions here.'}
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <Plus size={16} />
                <span>Add Your First AI Note</span>
              </button>
            </div>
          )}

          {/* Table View (shown when viewMode === 'table' or (viewMode === 'auto' on desktop lg screens)) */}
          {!loading && filteredNotes.length > 0 && (
            <div className={`${viewMode === 'table' ? 'block' : viewMode === 'grid' ? 'hidden' : 'hidden lg:block'} overflow-x-auto scrollbar-thin`}>
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                    theme === 'dark' 
                      ? 'border-white/5 text-slate-400 bg-white/[0.02]' 
                      : 'border-slate-100 text-slate-500 bg-slate-50/70'
                  }`}>
                    <th className="py-3.5 px-4 text-center w-20">ক্রমিক নং</th>
                    <th className="py-3.5 px-4 min-w-[200px]">CHAT TITLE</th>
                    <th className="py-3.5 px-3 min-w-[130px]">AI PROVIDER</th>
                    <th className="py-3.5 px-3 min-w-[120px]">CATEGORY</th>
                    <th className="py-3.5 px-3 min-w-[100px]">TYPE</th>
                    <th className="py-3.5 px-4 min-w-[150px]">GMAIL ACCOUNT</th>
                    <th className="py-3.5 px-4 min-w-[220px]">NOTES</th>
                    <th className="py-3.5 px-4 text-right min-w-[120px]">ACTIONS</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                  {filteredNotes.map((note, index) => {
                    const serialIndex = index + 1;
                    const serialFormatted = serialIndex < 10 ? `0${serialIndex}` : `${serialIndex}`;

                    return (
                      <tr
                        key={note.id}
                        onClick={() => setActiveViewNote(note)}
                        className={`text-xs cursor-pointer transition-all hover:bg-indigo-500/5 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {/* 1. ক্রমিক নং */}
                        <td className="py-4 px-4 text-center font-bold" onClick={(e) => e.stopPropagation()}>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono font-extrabold border ${
                            theme === 'dark'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`} title={`Note #${serialFormatted}`}>
                            #{serialFormatted}
                          </span>
                        </td>

                        {/* 2. CHAT TITLE */}
                        <td className="py-4 px-4 max-w-[240px] font-bold text-sm">
                          <div className="group/title relative flex items-center justify-between gap-1.5 max-w-full">
                            <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                              <span className={`truncate hover:text-indigo-400 transition-colors ${
                                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                              }`}>
                                {note.chatTitle}
                              </span>
                              <span className={`text-[11px] font-mono font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                                theme === 'dark'
                                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`} title={`${note.questionCount || 1}টি প্রশ্ন / টপিক`}>
                                ({note.questionCount || 1})
                              </span>
                            </div>

                            {/* Bengali Hover Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/title:flex flex-col z-30 pointer-events-none transition-all duration-200">
                              <div className={`px-3 py-1.5 rounded-xl shadow-2xl text-xs font-bold border flex items-center gap-1.5 whitespace-nowrap ${
                                theme === 'dark' 
                                  ? 'bg-slate-900 border-indigo-500/40 text-slate-100 shadow-indigo-500/20' 
                                  : 'bg-white border-indigo-200 text-indigo-950 shadow-indigo-200/50'
                              }`}>
                                <HelpCircle size={14} className="text-indigo-500 shrink-0" />
                                <span>এখানে {note.questionCount || 1}টি প্রশ্ন/টপিক আছে</span>
                              </div>
                              <div className={`w-2.5 h-2.5 rotate-45 border-r border-b ml-5 -mt-1.5 ${
                                theme === 'dark' ? 'bg-slate-900 border-indigo-500/40' : 'bg-white border-indigo-200'
                              }`}></div>
                            </div>

                            {/* Copy Title Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyChatTitle(note.chatTitle, note.id);
                              }}
                              className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1 hover:bg-slate-500/10 rounded text-slate-400 hover:text-indigo-500 ml-1 shrink-0"
                              title="Copy Chat Title"
                            >
                              {copiedId === note.id ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 3. AI PROVIDER */}
                        <td className="py-4 px-3 max-w-[130px] truncate">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border truncate inline-block max-w-full ${getProviderBadgeClass(note.aiProvider)}`} title={note.aiProvider}>
                            {note.aiProvider}
                          </span>
                        </td>

                        {/* 4. CATEGORY */}
                        <td className="py-4 px-3 max-w-[120px] truncate">
                          <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] truncate inline-flex items-center gap-1 border max-w-full ${
                            theme === 'dark'
                              ? 'bg-white/5 text-slate-300 border-white/10'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`} title={note.category}>
                            <Tag size={10} className="shrink-0 text-indigo-400" />
                            <span className="truncate">{note.category || 'General'}</span>
                          </span>
                        </td>

                        {/* 5. TYPE */}
                        <td className="py-4 px-3 max-w-[110px]">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border truncate inline-block ${getTypeBadgeClass(note.type)}`} title={note.type}>
                            {note.type}
                          </span>
                        </td>

                        {/* 6. GMAIL ACCOUNT */}
                        <td className={`py-4 px-4 font-mono max-w-[160px] truncate ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          <span className="flex items-center gap-1.5 truncate" title={note.gmail}>
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate text-[11px]">{note.gmail || 'No email'}</span>
                          </span>
                        </td>

                        {/* 7. NOTES */}
                        <td className={`py-4 px-4 max-w-xs font-medium ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          <p className="truncate line-clamp-1" title={note.notes}>
                            {note.notes}
                          </p>
                        </td>

                        {/* 8. ACTIONS */}
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setActiveViewNote(note)}
                              className={`p-1.5 rounded-lg transition-all ${
                                theme === 'dark' 
                                  ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                              title="View Note Details"
                            >
                              <FileText size={14} />
                            </button>

                            {note.chatLink && (
                              <a
                                href={note.chatLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
                                title="Open AI Chat Link"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}

                            <button
                              onClick={() => handleOpenEditModal(note)}
                              className={`p-1.5 rounded-lg transition-all ${
                                theme === 'dark' 
                                  ? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10' 
                                  : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                              }`}
                              title="Edit Note"
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete Note"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Cards Grid View (shown when viewMode === 'grid' or (viewMode === 'auto' on tablet/mobile screens < lg)) */}
          {!loading && filteredNotes.length > 0 && (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : viewMode === 'table' ? 'hidden' : 'grid grid-cols-1 sm:grid-cols-2 lg:hidden'} p-3 sm:p-4 gap-3 sm:gap-4`}>
              {filteredNotes.map((note, index) => {
                const serialIndex = index + 1;
                const serialFormatted = serialIndex < 10 ? `0${serialIndex}` : `${serialIndex}`;

                return (
                  <div
                    key={note.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all hover:border-indigo-500/40 hover:shadow-md ${
                      theme === 'dark'
                        ? 'bg-black/25 border-white/10 text-slate-200 hover:bg-white/[0.03]'
                        : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top row: Serial # + AI Provider + Question Count */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono font-extrabold border ${
                            theme === 'dark'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            #{serialFormatted}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getProviderBadgeClass(note.aiProvider)}`}>
                            {note.aiProvider}
                          </span>
                        </div>

                        <span className={`text-[11px] font-mono font-extrabold px-2 py-0.5 rounded border shrink-0 ${
                          theme === 'dark'
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          ({note.questionCount || 1}টি প্রশ্ন)
                        </span>
                      </div>

                      {/* Chat Title */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 
                          onClick={() => setActiveViewNote(note)}
                          className={`font-bold text-sm leading-snug flex-1 cursor-pointer hover:text-indigo-400 transition-colors line-clamp-2 ${
                            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                          }`}
                        >
                          {note.chatTitle}
                        </h4>
                        <button
                          onClick={() => handleCopyChatTitle(note.chatTitle, note.id)}
                          className="p-1 text-slate-400 hover:text-indigo-500 shrink-0"
                          title="Copy Title"
                        >
                          {copiedId === note.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>

                      {/* Category & Type Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold border inline-flex items-center gap-1 ${
                          theme === 'dark' ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <Tag size={10} className="text-indigo-400" />
                          <span className="truncate max-w-[120px]">{note.category || 'General'}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded uppercase font-extrabold border ${getTypeBadgeClass(note.type)}`}>
                          {note.type}
                        </span>
                      </div>

                      {/* Gmail */}
                      {note.gmail && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          <Mail size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{note.gmail}</span>
                        </div>
                      )}

                      {/* Notes Snippet */}
                      <p className={`text-xs line-clamp-2 p-2.5 rounded-xl border ${
                        theme === 'dark'
                          ? 'bg-black/30 text-slate-300 border-white/5'
                          : 'bg-slate-50 text-slate-700 border-slate-200 font-medium'
                      }`}>
                        {note.notes}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/50 dark:border-white/5 text-xs">
                      <span className="text-[10px] text-slate-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveViewNote(note)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-bold flex items-center gap-1 text-xs"
                        >
                          <FileText size={13} />
                          <span>View</span>
                        </button>
                        {note.chatLink && (
                          <a
                            href={note.chatLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-bold flex items-center gap-1 text-xs"
                          >
                            <ExternalLink size={13} />
                            <span>Chat</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(note)}
                          className={`p-1.5 rounded-lg transition-all ${
                            theme === 'dark' ? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title="Edit Note"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete Note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ================= MODAL 1: ADD / EDIT AI NOTE ================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border flex flex-col ${
                theme === 'dark' 
                  ? 'bg-[#0f172a] border-white/10 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-5 border-b flex items-center justify-between sticky top-0 z-10 ${
                theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {editingNote ? 'Edit AI Chat Note' : 'Add New AI Chat Note'}
                    </h3>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Save questions, notes, and AI solutions in the table vault
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveNote} className="p-6 space-y-4">
                
                {/* 1. Chat Title */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Chat Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. নিউটন-রেফসন পদ্ধতি বা React State Optimization"
                    value={formData.chatTitle}
                    onChange={(e) => setFormData({ ...formData, chatTitle: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                    }`}
                  />
                </div>

                {/* 2-Column: AI Provider & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* AI Provider */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      AI Provider <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.aiProvider}
                      onChange={(e) => setFormData({ ...formData, aiProvider: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                      }`}
                    >
                      {AI_PROVIDERS.map((p) => (
                        <option key={p} value={p} className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>
                          {p}
                        </option>
                      ))}
                    </select>

                    {formData.aiProvider === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter custom AI name..."
                        value={formData.customProvider}
                        onChange={(e) => setFormData({ ...formData, customProvider: e.target.value })}
                        className={`mt-2 w-full px-3 py-2 rounded-xl border text-xs ${
                          theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-xs font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Category <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryModalOpen(true);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>+ New Category</span>
                      </button>
                    </div>

                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                      }`}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name} className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3-Column: Type, Question Count & Gmail Account */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Type */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                      }`}
                    >
                      {NOTE_TYPES.map((t) => (
                        <option key={t} value={t} className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Question Count */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Q&A Count
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.questionCount}
                      onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) || 1 })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Gmail */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      Gmail Account
                    </label>
                    <input
                      type="email"
                      placeholder="account@gmail.com"
                      value={formData.gmail}
                      onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* 4. Notes (Prompt / Question Topic / Description) */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Notes (Question, Prompt, or Topic Summary) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Write your prompt, question, or key study note here..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                    }`}
                  />
                </div>

                {/* 5. Detailed AI Response / Generated Code (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      <Terminal size={14} className="text-emerald-400" />
                      <span>Full AI Response & Generated Code (Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Markdown & Code supported</span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="Paste the full AI answer, generated code snippets, mathematical derivations, or solutions..."
                    value={formData.aiResponse}
                    onChange={(e) => setFormData({ ...formData, aiResponse: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:ring-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-black/60 border-white/10 text-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                        : 'bg-slate-900 border-slate-800 text-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20'
                    }`}
                  />
                </div>

                {/* 6. AI Chat Share Link */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <ExternalLink size={13} className="text-indigo-400" />
                    <span>AI Chat Share Link / URL (Optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://chatgpt.com/share/... or https://aistudio.google.com/..."
                    value={formData.chatLink}
                    onChange={(e) => setFormData({ ...formData, chatLink: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500 focus:ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-white'
                    }`}
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      theme === 'dark'
                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                  >
                    {editingNote ? 'Save Changes' : 'Save AI Note'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 2: CATEGORY MANAGER ================= */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl border flex flex-col ${
                theme === 'dark' 
                  ? 'bg-[#0f172a] border-white/10 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className={`p-5 border-b flex items-center justify-between sticky top-0 z-10 ${
                theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <FolderPlus size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Manage AI Categories</h3>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Organize your notes into custom categories
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Create New Category */}
                <div className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Create New Category
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. JavaScript, Algorithms, Exam 2026..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateCategory();
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-white focus:border-indigo-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Existing Categories List */}
                <div className="space-y-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Existing Categories ({categories.length})
                  </label>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {categories.map((cat) => {
                      const count = notes.filter((n) => n.category === cat.name).length;
                      const isEditing = editingCategoryId === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className={`flex-1 px-2.5 py-1 text-xs rounded-lg border focus:outline-none ${
                                  theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-slate-300'
                                }`}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateCategory(cat);
                                  if (e.key === 'Escape') setEditingCategoryId(null);
                                }}
                              />
                              <button
                                onClick={() => handleUpdateCategory(cat)}
                                className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingCategoryId(null)}
                                className="p-1 text-slate-400 hover:bg-white/10 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Tag size={13} className="text-indigo-400 shrink-0" />
                                <span className="font-bold text-xs">{cat.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                  theme === 'dark' ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {count} notes
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditingCategoryName(cat.name);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                  title="Rename Category"
                                >
                                  <Edit size={13} />
                                </button>
                                {cat.name !== 'General' && (
                                  <button
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete Category"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={`p-4 border-t flex justify-end ${
                theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
              }`}>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 3: FULL NOTE READER & CODE VIEWER ================= */}
      <AnimatePresence>
        {activeViewNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveViewNote(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border flex flex-col ${
                theme === 'dark' 
                  ? 'bg-[#0f172a] border-white/15 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Reader Header */}
              <div className={`p-6 border-b flex items-start justify-between gap-4 sticky top-0 z-10 ${
                theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'
              }`}>
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getProviderBadgeClass(activeViewNote.aiProvider)}`}>
                      {activeViewNote.aiProvider}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                      theme === 'dark' ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {activeViewNote.category || 'General'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${getTypeBadgeClass(activeViewNote.type)}`}>
                      {activeViewNote.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ({activeViewNote.questionCount || 1}টি প্রশ্ন / টপিক)
                    </span>
                  </div>

                  <h2 className="text-xl font-extrabold leading-snug">
                    {activeViewNote.chatTitle}
                  </h2>

                  {activeViewNote.gmail && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Mail size={13} />
                      <span>{activeViewNote.gmail}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleOpenEditModal(activeViewNote);
                      setActiveViewNote(null);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title="Edit Note"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => setActiveViewNote(null)}
                    className={`p-2 rounded-xl transition-all ${
                      theme === 'dark' ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Reader Body */}
              <div className="p-6 space-y-6">
                
                {/* Notes Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>Notes & Questions</span>
                  </h4>
                  <div className={`p-4 rounded-2xl border text-sm leading-relaxed whitespace-pre-wrap ${
                    theme === 'dark' ? 'bg-white/[0.02] border-white/5 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    {activeViewNote.notes}
                  </div>
                </div>

                {/* AI Response / Code Section */}
                {activeViewNote.aiResponse && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Terminal size={14} />
                        <span>AI Response & Solutions</span>
                      </h4>
                      <button
                        onClick={() => handleCopyAIResponse(activeViewNote.aiResponse || '')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        {copiedCodeId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedCodeId ? 'Copied!' : 'Copy Response'}</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-950 border-slate-800 text-emerald-300 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto shadow-inner">
                      {activeViewNote.aiResponse}
                    </div>
                  </div>
                )}

                {/* Chat Links */}
                {activeViewNote.chatLink && (
                  <div className="pt-2">
                    <a
                      href={activeViewNote.chatLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/25"
                    >
                      <ExternalLink size={15} />
                      <span>Open Original AI Chat Session</span>
                    </a>
                  </div>
                )}

                {/* Timestamps */}
                <div className="pt-4 border-t border-slate-200/50 dark:border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                  <span>Created: {new Date(activeViewNote.createdAt).toLocaleString()}</span>
                  <span>Last Updated: {new Date(activeViewNote.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
