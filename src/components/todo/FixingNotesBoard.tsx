import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, CheckCircle2, Circle, Image as ImageIcon, 
  Palette, X, Check, Save, Edit2, ChevronDown, CheckSquare, Square,
  Pin, PinOff, FolderPlus
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMasterDelete } from '../../context/MasterDeleteContext';
import { uploadImageToImgBB } from '../../lib/imgbb';

export interface FixingNoteItem {
  id: string;
  text: string;
  completed: boolean;
  groupId?: string;
}

export interface FixingNoteGroup {
  id: string;
  title: string;
  color: string;
}

export interface FixingNote {
  id: string;
  userId: string;
  title: string;
  items: FixingNoteItem[];
  groups?: FixingNoteGroup[];
  backgroundColor: string;
  headerColor: string;
  imageUrl?: string;
  width?: number;
  height?: number;
  positionX?: number;
  positionY?: number;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

const BG_COLORS = [
  '#fef08a', // yellow-200
  '#bfdbfe', // blue-200
  '#bbf7d0', // green-200
  '#fbcfe8', // pink-200
  '#e2e8f0', // slate-200
  '#1e293b', // slate-800
];

const HEADER_COLORS = [
  '#eab308', // yellow-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
  '#0f172a', // slate-900
];

export function FixingNotesBoard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [notes, setNotes] = useState<FixingNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, 'fixingNotes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FixingNote[];
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddNote = async () => {
    if (!db || !user) return;
    try {
      await addDoc(collection(db, 'fixingNotes'), {
        userId: user.uid,
        title: 'New Fixing Note',
        items: [],
        backgroundColor: theme === 'dark' ? '#1e293b' : '#fef08a',
        headerColor: theme === 'dark' ? '#0f172a' : '#eab308',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unpinnedNotes = notes.filter(n => !n.isPinned);
  const pinnedNotes = notes.filter(n => n.isPinned);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <button
          onClick={handleAddNote}
          className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm shadow-blue-500/20 text-sm hover:scale-105 active:scale-95"
        >
          <Plus size={16} /> Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border border-dashed ${
          theme === 'dark' ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Edit2 className="text-slate-400" size={32} />
          </div>
          <h3 className="font-medium mb-1">No fixing notes yet</h3>
          <p className="text-sm">Create a sticky note to start tracking client fixes and feedbacks.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            <AnimatePresence>
              {unpinnedNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {pinnedNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

const NoteCard: React.FC<{ note: FixingNote }> = ({ note }) => {
  const { theme } = useTheme();
  const { requireMasterDelete } = useMasterDelete();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(note.title);
  const [newItemText, setNewItemText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [addingItemToGroupId, setAddingItemToGroupId] = useState<string | null>(null);
  const [groupNewItemText, setGroupNewItemText] = useState('');
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [editingGroupColorId, setEditingGroupColorId] = useState<string | null>(null);

  const getTextColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1e293b' : '#f8fafc';
  };

  const headerTextColor = getTextColor(note.headerColor);
  const bodyTextColor = getTextColor(note.backgroundColor);

  const updateNote = async (updates: Partial<FixingNote>) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'fixingNotes', note.id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    requireMasterDelete(async () => {
      if (!db) return;
      try {
        await deleteDoc(doc(db, 'fixingNotes', note.id));
      } catch (e) { console.error(e); }
    });
  };

  const handleTitleSave = () => {
    if (titleInput.trim() !== note.title) {
      updateNote({ title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAddItem = (e?: React.FormEvent, groupId?: string) => {
    if (e) e.preventDefault();
    if (groupId) {
      if (!groupNewItemText.trim()) return;
      const newItem: FixingNoteItem = {
        id: Math.random().toString(36).substr(2, 9),
        text: groupNewItemText.trim(),
        completed: false,
        groupId
      };
      updateNote({ items: [...note.items, newItem] });
      setGroupNewItemText('');
      setAddingItemToGroupId(null);
    } else {
      if (!newItemText.trim()) return;
      const newItem: FixingNoteItem = {
        id: Math.random().toString(36).substr(2, 9),
        text: newItemText.trim(),
        completed: false
      };
      updateNote({ items: [...note.items, newItem] });
      setNewItemText('');
    }
  };

  const handleAddGroupSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGroupTitle.trim()) {
      setIsAddingGroup(false);
      return;
    }
    const newGroup: FixingNoteGroup = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGroupTitle.trim(),
      color: 'rgba(0, 0, 0, 0.05)'
    };
    updateNote({ groups: [...(note.groups || []), newGroup] });
    setNewGroupTitle('');
    setIsAddingGroup(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    requireMasterDelete(() => {
      const updatedGroups = (note.groups || []).filter(g => g.id !== groupId);
      const updatedItems = note.items.filter(i => i.groupId !== groupId);
      updateNote({ groups: updatedGroups, items: updatedItems });
      setConfirmDeleteGroupId(null);
    });
  };

  const handleChangeGroupColor = (groupId: string, color: string) => {
    const updatedGroups = (note.groups || []).map(g => g.id === groupId ? { ...g, color } : g);
    updateNote({ groups: updatedGroups });
  };

  const handleToggleItem = (itemId: string) => {
    const updatedItems = note.items.map(it => it.id === itemId ? { ...it, completed: !it.completed } : it);
    updateNote({ items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    requireMasterDelete(() => {
      const updatedItems = note.items.filter(it => it.id !== itemId);
      updateNote({ items: updatedItems });
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const url = await uploadImageToImgBB(file);
      if (url) {
        updateNote({ imageUrl: url });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = () => {
    requireMasterDelete(() => {
      updateNote({ imageUrl: '' });
    });
  };

  const handlePositionDrag = (e: React.PointerEvent) => {
    if (!note.isPinned) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = note.positionX ?? (window.innerWidth / 2 - 150);
    const startTop = note.positionY ?? 100;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (noteRef.current) {
        noteRef.current.style.left = `${startLeft + (moveEvent.clientX - startX)}px`;
        noteRef.current.style.top = `${startTop + (moveEvent.clientY - startY)}px`;
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      updateNote({ 
        positionX: startLeft + (upEvent.clientX - startX), 
        positionY: startTop + (upEvent.clientY - startY) 
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = noteRef.current?.offsetWidth || 300;
    const startHeight = noteRef.current?.offsetHeight || 200;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newWidth = Math.max(250, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(150, startHeight + (moveEvent.clientY - startY));
      if (noteRef.current) {
        noteRef.current.style.width = `${newWidth}px`;
        noteRef.current.style.height = `${newHeight}px`;
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      const finalWidth = Math.max(250, startWidth + (upEvent.clientX - startX));
      const finalHeight = Math.max(150, startHeight + (upEvent.clientY - startY));
      updateNote({ width: finalWidth, height: finalHeight });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const renderItem = (item: FixingNoteItem) => (
    <div key={item.id} className="flex items-start gap-2 group/item">
      <button
        onClick={() => handleToggleItem(item.id)}
        className="mt-0.5 flex-shrink-0 transition-opacity hover:opacity-70"
      >
        {item.completed ? (
          <CheckSquare size={16} style={{ color: bodyTextColor, opacity: 0.8 }} />
        ) : (
          <Square size={16} style={{ color: bodyTextColor, opacity: 0.5 }} />
        )}
      </button>
      <span className={`flex-1 text-sm ${item.completed ? 'line-through opacity-60' : ''}`} style={{ wordBreak: 'break-word' }}>
        {item.text}
      </span>
      <button
        onClick={() => handleDeleteItem(item.id)}
        className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-black/5 transition-all text-red-500/80 hover:text-red-500"
      >
        <X size={14} />
      </button>
    </div>
  );

  return (
    <motion.div
      ref={noteRef}
      layout={!note.isPinned}
      initial={note.isPinned ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={note.isPinned ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      exit={note.isPinned ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      style={{ 
        backgroundColor: note.backgroundColor, 
        color: bodyTextColor,
        width: note.width || (note.isPinned ? 300 : 'auto'),
        height: note.height || 'auto',
        minHeight: 150,
        ...(note.isPinned ? {
          position: 'fixed',
          top: note.positionY ?? 100,
          left: note.positionX ?? (window.innerWidth / 2 - 150),
          zIndex: 100,
        } : {
          position: 'relative',
        })
      }}
      className={`rounded-2xl shadow-xl overflow-hidden flex flex-col group ${note.isPinned ? 'shadow-2xl' : ''}`}
    >
      {/* Header */}
      <div 
        onPointerDown={handlePositionDrag}
        style={{ backgroundColor: note.headerColor, color: headerTextColor }}
        className={`px-4 py-3 flex items-center justify-between ${note.isPinned ? 'cursor-move' : ''}`}
      >
        {isEditingTitle ? (
          <input
            autoFocus
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSave}
            onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
            className="bg-transparent border-b border-white/30 focus:border-white focus:outline-none flex-1 font-bold mr-2 px-1"
          />
        ) : (
          <h3 
            className="font-bold flex-1 truncate cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsEditingTitle(true)}
          >
            {note.title}
          </h3>
        )}

        <div className="flex items-center gap-1 transition-opacity">
          <div className="relative">
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              title="Change Colors"
            >
              <Palette size={14} />
            </button>
            
            <AnimatePresence>
              {showColorPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl z-20 border border-slate-200 dark:border-slate-700 w-48"
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">Header Color</div>
                        <div className="flex flex-wrap gap-1.5">
                          {HEADER_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => { updateNote({ headerColor: color }); }}
                              style={{ backgroundColor: color }}
                              className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">Note Color</div>
                        <div className="flex flex-wrap gap-1.5">
                          {BG_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => { updateNote({ backgroundColor: color }); }}
                              style={{ backgroundColor: color }}
                              className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setIsAddingGroup(true)}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            title="Add Group"
          >
            <FolderPlus size={14} />
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            title="Add Image"
          >
            <ImageIcon size={14} className={uploadingImage ? 'animate-pulse' : ''} />
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />

          <button 
            onClick={() => updateNote({ isPinned: !note.isPinned })}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            title={note.isPinned ? "Unpin Note" : "Pin Note (Floating)"}
          >
            {note.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          
          {confirmDeleteNote ? (
            <div className="flex items-center gap-1 ml-1 bg-red-500/10 rounded-lg p-1 text-xs">
              <span className="opacity-80">Sure?</span>
              <button onClick={handleDelete} className="px-1 hover:text-red-300 font-bold">Yes</button>
              <button onClick={() => setConfirmDeleteNote(false)} className="px-1 hover:text-white">No</button>
            </div>
          ) : (
            <button 
              onClick={() => setConfirmDeleteNote(true)}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-100 hover:text-red-200 transition-colors ml-1"
              title="Delete Note"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Image (if any) */}
      {note.imageUrl && (
        <div className="relative border-b border-black/10">
          <img src={note.imageUrl} alt="Note Attachment" className="w-full h-auto max-h-48 object-cover" />
          <button
            onClick={handleDeleteImage}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Items List */}
      <div className="p-4 flex-1 space-y-2 overflow-y-auto min-h-[50px] custom-scrollbar">
        {note.items.filter(i => !i.groupId).map(renderItem)}

        {/* Groups */}
        {note.groups && note.groups.map(group => (
          <div key={group.id} style={{ backgroundColor: group.color }} className="group/group mt-4 rounded-lg border border-black/10 overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between border-b border-black/10">
              <span className="font-bold text-sm opacity-90">{group.title}</span>
              <div className="flex items-center opacity-0 group-hover/group:opacity-100 transition-opacity">
                {editingGroupColorId === group.id ? (
                  <div className="flex gap-1 items-center px-1">
                    {['#fee2e2', '#dcfce7', '#e0e7ff', '#fef3c7', 'rgba(0,0,0,0.05)'].map(c => (
                      <button key={c} onClick={() => { handleChangeGroupColor(group.id, c); setEditingGroupColorId(null); }} className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: c }} />
                    ))}
                    <button onClick={() => setEditingGroupColorId(null)} className="ml-1 opacity-50 hover:opacity-100"><X size={10} /></button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setEditingGroupColorId(group.id)}
                    className="p-1 rounded hover:bg-black/10"
                    title="Change Group Color"
                  >
                    <Palette size={12} />
                  </button>
                )}
                
                {confirmDeleteGroupId === group.id ? (
                  <div className="flex text-[10px] items-center ml-1 bg-red-500/10 rounded px-1">
                    <button onClick={() => handleDeleteGroup(group.id)} className="px-1 font-bold text-red-600 hover:text-red-700">Del</button>
                    <button onClick={() => setConfirmDeleteGroupId(null)} className="px-1 text-black/60 hover:text-black">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteGroupId(group.id)}
                    className="p-1 rounded hover:bg-black/10 text-red-500/80 hover:text-red-500"
                    title="Delete Group"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-2 space-y-1.5" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
              {note.items.filter(i => i.groupId === group.id).map(renderItem)}
              
              {addingItemToGroupId === group.id ? (
                <form onSubmit={(e) => handleAddItem(e, group.id)} className="flex items-center gap-1 mt-1 border-t border-black/5 pt-1">
                  <input
                    autoFocus
                    type="text"
                    value={groupNewItemText}
                    onChange={e => setGroupNewItemText(e.target.value)}
                    placeholder="Item details..."
                    className="flex-1 text-xs px-1 bg-transparent border-b border-black/20 focus:outline-none"
                    style={{ color: bodyTextColor }}
                  />
                  <button type="button" onClick={() => setAddingItemToGroupId(null)} className="p-0.5 opacity-50 hover:opacity-100">
                    <X size={12} />
                  </button>
                  <button type="submit" disabled={!groupNewItemText.trim()} className="p-0.5 opacity-50 hover:opacity-100 disabled:opacity-20">
                    <Check size={12} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setAddingItemToGroupId(group.id)}
                  className="text-xs font-medium opacity-50 hover:opacity-100 flex items-center gap-1 w-full p-1 mt-1 border border-dashed border-black/10 rounded"
                >
                  <Plus size={12} /> Add item to {group.title}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Group Form */}
        {isAddingGroup && (
          <form onSubmit={handleAddGroupSubmit} className="mt-4 p-2 rounded-lg border border-dashed border-black/30 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newGroupTitle}
              onChange={e => setNewGroupTitle(e.target.value)}
              placeholder="Group title (e.g. Page Name)"
              className="flex-1 text-sm bg-transparent border-b border-black/20 focus:outline-none"
              style={{ color: bodyTextColor }}
            />
            <button type="button" onClick={() => setIsAddingGroup(false)} className="p-1 opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
            <button type="submit" disabled={!newGroupTitle.trim()} className="p-1 bg-black/10 rounded hover:bg-black/20 disabled:opacity-50 transition-colors">
              <Check size={14} />
            </button>
          </form>
        )}

        {/* Add Item Field */}
        <form onSubmit={(e) => handleAddItem(e)} className="flex gap-2 pt-2 mt-4 border-t border-black/10">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add new fix or note..."
            style={{ color: bodyTextColor }}
            className="flex-1 bg-transparent px-1 py-1 text-sm border-b border-transparent focus:border-black/20 focus:outline-none placeholder:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="p-1 rounded opacity-50 hover:opacity-100 hover:bg-black/5 transition-all disabled:opacity-20"
          >
            <Plus size={16} />
          </button>
        </form>
      </div>

      {/* Resize Handle */}
      <div 
        onPointerDown={handleResize}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-10 flex items-end justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="w-2.5 h-2.5 border-r-[3px] border-b-[3px] rounded-br-[1px]" style={{ borderColor: headerTextColor, opacity: 0.4 }} />
      </div>
    </motion.div>
  );
}
