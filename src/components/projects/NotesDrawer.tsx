import React, { useState, useEffect } from 'react';
import { Project, NoteTag, Note } from '../../types';
import { X, Pin, Edit2, Trash2, Check, Filter, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatRelativeTime } from '../../utils/dateUtils';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTheme } from '../../context/ThemeContext';

const CATEGORIES: NoteTag[] = [
  'Clarification',
  'Update Message',
  'Follow Up',
  'Delivery',
  'Meeting Summary',
  'Fixing Update',
  'Extend Message',
  'Ask For Additional Charge',
  'Hyper Client Convenience'
];

interface NotesDrawerProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
}

export function NotesDrawer({ project, isOpen, onClose, onUpdateProject }: NotesDrawerProps) {
  const { theme } = useTheme();
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteTag>('Clarification');
  
  useBodyScrollLock(isOpen);
  
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  
  const [filterCategory, setFilterCategory] = useState<NoteTag | 'All'>('All');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('Clarification');
      setNewNoteContent('');
      setEditingNoteId(null);
      setFilterCategory('All');
    }
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const notes = project.notes || [];

  const filteredNotes = notes.filter(note => {
    const matchesCategory = filterCategory === 'All' || note.tags.includes(filterCategory);
    return matchesCategory;
  });

  const displayCategories = filterCategory === 'All' ? CATEGORIES : [filterCategory];

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    const newNote: Note = {
      id: crypto.randomUUID(),
      content: newNoteContent.trim(),
      timestamp: new Date().toISOString(),
      tags: [selectedCategory],
      isPinned: false
    };

    onUpdateProject(project.id, {
      notes: [...notes, newNote]
    });

    setNewNoteContent('');
  };

  const togglePin = (noteId: string) => {
    const updatedNotes = notes.map(n => 
      n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
    );
    onUpdateProject(project.id, { notes: updatedNotes });
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    onUpdateProject(project.id, { notes: updatedNotes });
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditNoteContent('');
  };

  const saveEdit = (noteId: string) => {
    if (!editNoteContent.trim()) return;
    
    const updatedNotes = notes.map(n => 
      n.id === noteId ? { ...n, content: editNoteContent.trim(), timestamp: new Date().toISOString() } : n
    );
    onUpdateProject(project.id, { notes: updatedNotes });
    cancelEdit();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteId(id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
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
            className={`relative w-full sm:max-w-md h-full shadow-2xl flex flex-col border-l ${
              theme === 'dark' ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`px-4 sm:px-6 py-3 sm:py-3.5 border-b flex justify-between items-center shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex-1 min-w-0 pr-4">
                <h2 className={`text-sm sm:text-base font-semibold tracking-tight truncate ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`} title={project.title}>
                  Notes for {project.title}
                </h2>
                <p className={`text-[9px] sm:text-[10px] mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                  {notes.length} total notes
                </p>
              </div>
              <button onClick={onClose} className={`p-1.5 rounded-lg transition-all shrink-0 ${
                theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}>
                <X size={14} className="sm:w-[16px] sm:h-[16px]" />
              </button>
            </div>

            <div className={`px-4 sm:px-6 py-2 sm:py-2.5 border-b shrink-0 ${
              theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide snap-x">
                <button
                  onClick={() => setFilterCategory('All')}
                  className={`whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all snap-start shrink-0 ${
                    filterCategory === 'All' 
                      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                      : theme === 'dark'
                        ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map(category => {
                  const count = notes.filter(n => n.tags.includes(category)).length;
                  if (count === 0 && filterCategory !== category) return null;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setFilterCategory(category)}
                      className={`whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all snap-start shrink-0 flex items-center gap-1 ${
                        filterCategory === category 
                          ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                          : theme === 'dark'
                            ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {category}
                      <span className={`px-1 py-0.5 rounded-full text-[8px] ${
                        filterCategory === category 
                          ? 'bg-white/20 text-white' 
                          : theme === 'dark' ? 'bg-black/30 text-gray-500' : 'bg-white text-slate-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 scrollbar-thin">
          {filteredNotes.length === 0 ? (
            <div className={`text-center mt-10 p-8 rounded-2xl border ${
              theme === 'dark' ? 'text-gray-500 bg-white/5 border-white/5' : 'text-slate-400 bg-slate-50 border-slate-100'
            }`}>
              <p className="text-sm font-medium">No notes found.</p>
            </div>
          ) : (
            displayCategories.map(category => {
              const categoryNotes = filteredNotes.filter(n => n.tags.includes(category));
              if (categoryNotes.length === 0) return null;

              const sortedNotes = [...categoryNotes].sort((a, b) => {
                if (a.isPinned === b.isPinned) {
                  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                }
                return a.isPinned ? -1 : 1;
              });

              return (
                <div key={category} className="space-y-3">
                  <div className={`flex justify-between items-center border-b pb-1.5 ${
                    theme === 'dark' ? 'border-white/5' : 'border-slate-100'
                  }`}>
                    <h3 className={`text-[10px] font-bold uppercase tracking-[0.1em] ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}>{category}</h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                      theme === 'dark' ? 'bg-white/5 text-gray-400 border-white/5' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {categoryNotes.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {sortedNotes.map(note => {
                      const isLong = note.content.length > 200;
                      const isExpanded = expandedNotes.has(note.id);
                      const displayContent = isLong && !isExpanded 
                        ? note.content.slice(0, 200) + '...' 
                        : note.content;

                      return (
                        <div key={note.id} className={`p-3 sm:p-3.5 rounded-xl border transition-colors relative group ${
                          theme === 'dark' 
                            ? `bg-white/5 ${note.isPinned ? 'border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'border-white/5'} hover:border-white/10`
                            : `bg-white ${note.isPinned ? 'border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'border-slate-200'} hover:border-slate-300 shadow-sm`
                        }`}>
                          {note.isPinned && (
                            <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white p-1 rounded-full shadow-lg shadow-blue-500/30 z-10">
                              <Pin size={8} className="fill-current" />
                            </div>
                          )}
                          
                          {editingNoteId === note.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editNoteContent}
                                onChange={(e) => setEditNoteContent(e.target.value)}
                                className={`w-full border rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all ${
                                  theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={cancelEdit}
                                  className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-all ${
                                    theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                  }`}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEdit(note.id)}
                                  disabled={!editNoteContent.trim()}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-medium hover:bg-blue-500 disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)] hover:scale-105 active:scale-95"
                                >
                                  <Check size={10} /> Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex-1 pr-6">
                                  <p className={`text-[11px] sm:text-xs whitespace-pre-wrap leading-relaxed ${
                                    theme === 'dark' ? 'text-gray-300' : 'text-slate-700'
                                  }`}>
                                    {displayContent}
                                  </p>
                                  {isLong && (
                                    <button 
                                      onClick={() => toggleExpand(note.id)}
                                      className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${
                                        theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                      }`}
                                    >
                                      {isExpanded ? 'Show Less' : 'Read More'}
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                                  <button
                                    onClick={() => handleCopy(note.content, note.id)}
                                    className={`p-1 rounded-lg transition-colors ${
                                      theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Copy Note"
                                  >
                                    {copiedNoteId === note.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                  </button>
                                  <button
                                    onClick={() => togglePin(note.id)}
                                    className={`p-1 rounded-lg transition-colors ${
                                      note.isPinned 
                                        ? theme === 'dark' ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'
                                        : theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title={note.isPinned ? "Unpin Note" : "Pin Note"}
                                  >
                                    <Pin size={12} className={note.isPinned ? "fill-current" : ""} />
                                  </button>
                                  <button
                                    onClick={() => startEdit(note)}
                                    className={`p-1 rounded-lg transition-colors ${
                                      theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Edit Note"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className={`p-1 rounded-lg transition-colors ${
                                      theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title="Delete Note"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <span className={`text-[8px] sm:text-[9px] font-medium mt-1.5 block uppercase tracking-wider ${
                                theme === 'dark' ? 'text-gray-500' : 'text-slate-400'
                              }`}>
                                {formatRelativeTime(note.timestamp)}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={`p-3 sm:p-4 border-t shrink-0 ${
          theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
        }`}>
          <textarea
            className={`w-full border rounded-xl p-2.5 sm:p-3 text-[11px] sm:text-xs focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none mb-2.5 sm:mb-3 transition-all ${
              theme === 'dark' 
                ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600' 
                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
            }`}
            rows={2}
            placeholder="Add a new note..."
            value={newNoteContent}
            onChange={e => setNewNoteContent(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className={`flex-1 border rounded-xl px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all ${
                theme === 'dark' 
                  ? 'bg-black/50 border-white/10 text-gray-300' 
                  : 'bg-white border-slate-200 text-slate-700 shadow-sm'
              }`}
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as NoteTag)}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c} className={theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleAddNote}
              className="bg-blue-600 text-white px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] whitespace-nowrap hover:scale-105 active:scale-95"
            >
              Add Note
            </button>
          </div>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
