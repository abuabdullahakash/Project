import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, CheckCircle2, Circle, Calendar, AlertCircle, 
  Filter, Search, MoreVertical, Edit2, Clock, Tag, FileText,
  ChevronDown, ChevronUp, CheckCircle, X, Save, GripVertical,
  ListTodo, Flag, Copy, ArrowUp, ArrowDown, CheckSquare, Square,
  Play, Pause, RotateCcw, Bell
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useMasterDelete } from '../../context/MasterDeleteContext';
import { useTheme } from '../../context/ThemeContext';
import { Todo, Subtask } from '../../types';
import { auth } from '../../lib/firebase';
import { FixingNotesBoard } from './FixingNotesBoard';

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const CATEGORIES = ['Work', 'Personal', 'Urgent', 'Shopping', 'Health', 'Finance', 'Other'];

export function TodoManager() {
  const { user } = useAuth();
  const { requireMasterDelete } = useMasterDelete();
  const { theme } = useTheme();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCategory, setNewCategory] = useState('Work');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(30);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [isFlagged, setIsFlagged] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [view, setView] = useState<'tasks' | 'fixing-notes'>('tasks');

  useEffect(() => {
    if (!db || !user) return;

    const q = query(
      collection(db, 'todos'),
      where('userId', '==', user.uid),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todoData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
      setTodos(todoData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'todos');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user || !db) return;

    try {
      const subtasksData: Subtask[] = newSubtasks.map(title => ({
        id: Math.random().toString(36).substr(2, 9),
        title,
        completed: false
      }));

      const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order || 0)) : 0;

      await addDoc(collection(db, 'todos'), {
        userId: user.uid,
        title: newTodo.trim(),
        notes: newNotes.trim() || null,
        category: newCategory,
        tags: newTags,
        completed: false,
        isFlagged,
        priority,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        estimatedTime: estimatedTime || 0,
        subtasks: subtasksData,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setNewTodo('');
      setNewNotes('');
      setDueDate('');
      setDueTime('');
      setPriority('Medium');
      setNewSubtasks([]);
      setSubtaskInput('');
      setNewTags([]);
      setTagInput('');
      setReminderMinutes(30);
      setEstimatedTime(0);
      setIsFlagged(false);
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'todos');
    }
  };

  const addSubtaskToNewTodo = () => {
    if (subtaskInput.trim()) {
      setNewSubtasks([...newSubtasks, subtaskInput.trim()]);
      setSubtaskInput('');
    }
  };

  const removeSubtaskFromNewTodo = (index: number) => {
    setNewSubtasks(newSubtasks.filter((_, i) => i !== index));
  };

  const addTagToNewTodo = () => {
    if (tagInput.trim() && !newTags.includes(tagInput.trim())) {
      setNewTags([...newTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTagFromNewTodo = (tag: string) => {
    setNewTags(newTags.filter(t => t !== tag));
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === filteredTodos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTodos.map(t => t.id)));
    }
  };

  const bulkDelete = async () => {
    requireMasterDelete(async () => {
      if (!db || selectedIds.size === 0) return;
      try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, 'todos', id));
        });
        await batch.commit();
        setSelectedIds(new Set());
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'todos/bulk-delete');
      }
    });
  };

  const bulkToggleComplete = async (completed: boolean) => {
    if (!db || selectedIds.size === 0) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'todos', id), {
          completed,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      setSelectedIds(new Set());
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'todos/bulk-update');
    }
  };

  const duplicateTodo = async (todo: Todo) => {
    if (!db || !user) return;
    try {
      const { id, ...rest } = todo;
      const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order || 0)) : 0;
      await addDoc(collection(db, 'todos'), {
        ...rest,
        title: `${todo.title} (Copy)`,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'todos/duplicate');
    }
  };

  const moveToTop = async (todo: Todo) => {
    if (!db) return;
    try {
      const minOrder = todos.length > 0 ? Math.min(...todos.map(t => t.order || 0)) : 0;
      await updateDoc(doc(db, 'todos', todo.id), {
        order: minOrder - 1,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${todo.id}/move-top`);
    }
  };

  const moveToBottom = async (todo: Todo) => {
    if (!db) return;
    try {
      const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order || 0)) : 0;
      await updateDoc(doc(db, 'todos', todo.id), {
        order: maxOrder + 1,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${todo.id}/move-bottom`);
    }
  };

  const toggleFlag = async (todo: Todo) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        isFlagged: !todo.isFlagged,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${todo.id}/toggle-flag`);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex((t) => t.id === active.id);
      const newIndex = todos.findIndex((t) => t.id === over.id);

      const newTodos = arrayMove(todos, oldIndex, newIndex);
      setTodos(newTodos);

      // Update order in Firestore
      if (db) {
        try {
          const batch = writeBatch(db);
          newTodos.forEach((todo: Todo, index) => {
            batch.update(doc(db, 'todos', todo.id), {
              order: index,
              updatedAt: new Date().toISOString()
            });
          });
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'todos/reorder');
        }
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const toggleTodo = async (todo: Todo) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        completed: !todo.completed,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${todo.id}`);
    }
  };

  const deleteTodo = async (id: string) => {
    requireMasterDelete(async () => {
      if (!db) return;
      try {
        await deleteDoc(doc(db, 'todos', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `todos/${id}`);
      }
    });
  };

  const clearCompleted = async () => {
    requireMasterDelete(async () => {
      if (!db || !user) return;
      try {
        const completedTodos = todos.filter(t => t.completed);
        const batch = writeBatch(db);
        completedTodos.forEach(t => {
          batch.delete(doc(db, 'todos', t.id));
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'todos/batch');
      }
    });
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditNotes(todo.notes || '');
    setEditDueDate(todo.dueDate || '');
    setEditDueTime(todo.dueTime || '');
  };

  const saveEdit = async (id: string) => {
    if (!db || !editTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'todos', id), {
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
        dueDate: editDueDate || null,
        dueTime: editDueTime || null,
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${id}`);
    }
  };

  const filteredTodos = todos.filter(todo => {
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'active' ? !todo.completed :
      todo.completed;
    
    const matchesSearch = 
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      todo.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const activeTodos = filteredTodos.filter(t => !t.completed);
  const completedTodos = filteredTodos.filter(t => t.completed);

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              My To-Do List
            </h1>
            <p className="text-sm text-slate-500">Manage your daily tasks and priorities</p>
          </div>
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 w-max">
            <button
              onClick={() => setView('tasks')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'tasks' 
                  ? (theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setView('fixing-notes')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'fixing-notes' 
                  ? (theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Fixing Notes
            </button>
          </div>
        </div>
        
        {view === 'tasks' && <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
            theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="text-center">
              <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.active}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Active</div>
            </div>
            <div className={`w-px h-8 mx-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className="text-center">
              <div className={`text-lg font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.completed}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Done</div>
            </div>
          </div>
          
          {stats.completed > 0 && (
            <button
              onClick={clearCompleted}
              className={`p-2 rounded-xl transition-all ${
                theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
              title="Clear Completed"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>}
      </div>

      {view === 'tasks' ? (
        <>
          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-6 ${
                  theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {selectedIds.size} selected
              </span>
              <button 
                onClick={toggleAllSelection}
                className="text-xs text-blue-500 hover:underline font-medium"
              >
                {selectedIds.size === filteredTodos.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className={`w-px h-6 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`} />
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkToggleComplete(true)}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark' ? 'hover:bg-white/5 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'
                }`}
                title="Mark as Completed"
              >
                <CheckCircle2 size={20} />
              </button>
              <button
                onClick={() => bulkToggleComplete(false)}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark' ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
                title="Mark as Active"
              >
                <Circle size={20} />
              </button>
              <button
                onClick={bulkDelete}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-600'
                }`}
                title="Delete Selected"
              >
                <Trash2 size={20} />
              </button>
            </div>
            
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Todo Button/Form */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className={`w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${
            theme === 'dark' 
              ? 'border-white/10 text-slate-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5' 
              : 'border-slate-200 text-slate-500 hover:border-blue-500/50 hover:text-blue-600 hover:bg-blue-50'
          }`}
        >
          <Plus size={20} />
          <span className="font-medium">Add New Task</span>
        </button>
      ) : (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddTodo} 
          className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-slate-900 border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>New Task</h3>
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                autoFocus
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="Task title..."
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-800 text-white border-slate-700 placeholder-slate-500' 
                    : 'bg-slate-50 text-slate-900 border-slate-200 placeholder-slate-400'
                }`}
              />
              
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add notes (optional)..."
                rows={2}
                className={`w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none ${
                  theme === 'dark' 
                    ? 'bg-slate-800 text-white border-slate-700 placeholder-slate-500' 
                    : 'bg-slate-50 text-slate-900 border-slate-200 placeholder-slate-400'
                }`}
              />

              {/* Subtasks Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Subtasks</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtaskToNewTodo())}
                    placeholder="Add a subtask..."
                    className={`flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={addSubtaskToNewTodo}
                    className={`p-2 rounded-xl transition-all ${
                      theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {newSubtasks.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newSubtasks.map((st, i) => (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-medium ${
                        theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span>{st}</span>
                        <button type="button" onClick={() => removeSubtaskFromNewTodo(i)} className="hover:text-red-500">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTagToNewTodo())}
                    placeholder="Add a tag..."
                    className={`flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={addTagToNewTodo}
                    className={`p-2 rounded-xl transition-all ${
                      theme === 'dark' ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {newTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {newTags.map((tag, i) => (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-medium ${
                        theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <span>#{tag}</span>
                        <button type="button" onClick={() => removeTagFromNewTodo(tag)} className="hover:text-red-500">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Priority</label>
                <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {(['Low', 'Medium', 'High'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        priority === p
                          ? (p === 'High' ? 'bg-red-500 text-white' : p === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white')
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                  }`}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Due Time</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Est. Time (min)</label>
                <input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
                  min="0"
                  className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsFlagged(!isFlagged)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isFlagged 
                    ? 'bg-red-500/10 text-red-500' 
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Flag size={14} className={isFlagged ? 'fill-red-500' : ''} />
                {isFlagged ? 'Flagged' : 'Flag Task'}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTodo.trim()}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  newTodo.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Plus size={18} /> Create Task
              </button>
            </div>
          </div>
        </motion.form>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 w-full sm:w-auto">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f
                  ? (theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, notes, categories..."
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
              theme === 'dark' ? 'bg-white/5 text-white border-white/10' : 'bg-white text-slate-900 border-slate-200 shadow-sm'
            }`}
          />
        </div>
      </div>

      {/* Todo List */}
      <div className="space-y-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border border-dashed ${
            theme === 'dark' ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-slate-400" size={32} />
            </div>
            <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {searchQuery ? 'No matching tasks' : 'All caught up!'}
            </h3>
            <p className="text-sm text-slate-500">
              {searchQuery ? 'Try a different search term' : 'Enjoy your free time or add a new task.'}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Active Section */}
            {activeTodos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <h2 className={`text-xs font-bold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Active Tasks
                  </h2>
                  <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />
                  <span className="text-[10px] font-bold text-slate-500">{activeTodos.length}</span>
                </div>
                <SortableContext items={activeTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {activeTodos.map(todo => (
                      <TodoItem 
                        key={todo.id} 
                        todo={todo} 
                        theme={theme} 
                        onToggle={() => toggleTodo(todo)}
                        onDelete={() => deleteTodo(todo.id)}
                        onEdit={() => startEditing(todo)}
                        isEditing={editingId === todo.id}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        editNotes={editNotes}
                        setEditNotes={setEditNotes}
                        editDueDate={editDueDate}
                        setEditDueDate={setEditDueDate}
                        editDueTime={editDueTime}
                        setEditDueTime={setEditDueTime}
                        onSave={() => saveEdit(todo.id)}
                        onCancel={() => setEditingId(null)}
                        isSelected={selectedIds.has(todo.id)}
                        onToggleSelection={() => toggleSelection(todo.id)}
                        onDuplicate={() => duplicateTodo(todo)}
                        onMoveToTop={() => moveToTop(todo)}
                        onMoveToBottom={() => moveToBottom(todo)}
                        onToggleFlag={() => toggleFlag(todo)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}

            {/* Completed Section */}
            {completedTodos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 flex-1">
                    <h2 className={`text-xs font-bold uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Completed
                    </h2>
                    <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />
                    <span className="text-[10px] font-bold text-slate-500">{completedTodos.length}</span>
                  </div>
                  <button 
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`ml-4 p-1 rounded-lg transition-all ${
                      theme === 'dark' ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                    }`}
                  >
                    {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                
                <AnimatePresence>
                  {showCompleted && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {completedTodos.map(todo => (
                        <TodoItem 
                          key={todo.id} 
                          todo={todo} 
                          theme={theme} 
                          onToggle={() => toggleTodo(todo)}
                          onDelete={() => deleteTodo(todo.id)}
                          onEdit={() => startEditing(todo)}
                          isEditing={editingId === todo.id}
                          editTitle={editTitle}
                          setEditTitle={setEditTitle}
                          editNotes={editNotes}
                          setEditNotes={setEditNotes}
                          editDueDate={editDueDate}
                          setEditDueDate={setEditDueDate}
                          editDueTime={editDueTime}
                          setEditDueTime={setEditDueTime}
                          onSave={() => saveEdit(todo.id)}
                          onCancel={() => setEditingId(null)}
                          isSelected={selectedIds.has(todo.id)}
                          onToggleSelection={() => toggleSelection(todo.id)}
                          onDuplicate={() => duplicateTodo(todo)}
                          onMoveToTop={() => moveToTop(todo)}
                          onMoveToBottom={() => moveToBottom(todo)}
                          onToggleFlag={() => toggleFlag(todo)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.5',
                  },
                },
              }),
            }}>
              {activeId ? (
                <div className="w-full">
                  <TodoItem 
                    todo={todos.find(t => t.id === activeId)!} 
                    theme={theme} 
                    onToggle={() => {}}
                    onDelete={() => {}}
                    onEdit={() => {}}
                    isEditing={false}
                    editTitle=""
                    setEditTitle={() => {}}
                    editNotes=""
                    setEditNotes={() => {}}
                    editDueDate=""
                    setEditDueDate={() => {}}
                    editDueTime=""
                    setEditDueTime={() => {}}
                    onSave={() => {}}
                    onCancel={() => {}}
                    isSelected={selectedIds.has(activeId)}
                    onToggleSelection={() => {}}
                    onDuplicate={() => {}}
                    onMoveToTop={() => {}}
                    onMoveToBottom={() => {}}
                    onToggleFlag={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      </>
      ) : (
        <FixingNotesBoard />
      )}
    </div>
  );
}

interface TodoItemProps {
  key?: string | number;
  todo: Todo;
  theme: 'light' | 'dark';
  onToggle: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onEdit: () => void;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
  editDueDate: string;
  setEditDueDate: (v: string) => void;
  editDueTime: string;
  setEditDueTime: (v: string) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  isSelected: boolean;
  onToggleSelection: () => void;
  onDuplicate: () => void | Promise<void>;
  onMoveToTop: () => void | Promise<void>;
  onMoveToBottom: () => void | Promise<void>;
  onToggleFlag: () => void | Promise<void>;
}

const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, 
  theme, 
  onToggle, 
  onDelete, 
  onEdit, 
  isEditing, 
  editTitle, 
  setEditTitle, 
  editNotes, 
  setEditNotes, 
  editDueDate,
  setEditDueDate,
  editDueTime,
  setEditDueTime,
  onSave, 
  onCancel,
  isSelected,
  onToggleSelection,
  onDuplicate,
  onMoveToTop,
  onMoveToBottom,
  onToggleFlag
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const { requireMasterDelete } = useMasterDelete();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: isEditing || todo.completed
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const toggleSubtask = async (subtask: Subtask) => {
    if (!db) return;
    try {
      const updatedSubtasks = todo.subtasks?.map(st => 
        st.id === subtask.id ? { ...st, completed: !st.completed } : st
      );
      await updateDoc(doc(db, 'todos', todo.id), {
        subtasks: updatedSubtasks,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${todo.id}/subtasks`);
    }
  };

  const addSubtask = async () => {
    if (!newSubtask.trim() || !db) return;
    try {
      const subtask: Subtask = {
        id: Math.random().toString(36).substr(2, 9),
        title: newSubtask.trim(),
        completed: false
      };
      await updateDoc(doc(db, 'todos', todo.id), {
        subtasks: arrayUnion(subtask),
        updatedAt: new Date().toISOString()
      });
      setNewSubtask('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${todo.id}/subtasks`);
    }
  };

  const removeSubtask = async (subtask: Subtask) => {
    requireMasterDelete(async () => {
      if (!db) return;
      try {
        await updateDoc(doc(db, 'todos', todo.id), {
          subtasks: arrayRemove(subtask),
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `todos/${todo.id}/subtasks`);
      }
    });
  };

  const completedSubtasks = todo.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = todo.subtasks?.length || 0;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group rounded-2xl border transition-all overflow-hidden ${
        todo.completed
          ? (theme === 'dark' ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-slate-50/50 border-slate-100 opacity-60')
          : (theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')
      } ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="flex flex-col items-center gap-2 mt-1">
          <button
            onClick={onToggleSelection}
            className={`transition-colors ${
              isSelected 
                ? 'text-blue-500' 
                : (theme === 'dark' ? 'text-slate-700 hover:text-slate-500' : 'text-slate-200 hover:text-slate-400')
            }`}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
          {!todo.completed && !isEditing && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors">
              <GripVertical size={16} />
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          className={`mt-1 flex-shrink-0 transition-colors ${
            todo.completed
              ? 'text-emerald-500'
              : (theme === 'dark' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500')
          }`}
        >
          {todo.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                  theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className={`w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none ${
                  theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 ml-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                    }`}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 ml-1">Due Time</label>
                  <input
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-200'
                    }`}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="p-2 text-slate-500 hover:text-slate-700"><X size={18} /></button>
                <button onClick={onSave} className="p-2 text-blue-500 hover:text-blue-700"><Save size={18} /></button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold truncate ${
                      todo.completed 
                        ? 'line-through text-slate-500' 
                        : (theme === 'dark' ? 'text-slate-200' : 'text-slate-800')
                    }`}>
                      {todo.title}
                    </h3>
                    {todo.isFlagged && <Flag size={12} className="text-red-500 fill-red-500" />}
                  </div>
                  {totalSubtasks > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-16 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">{completedSubtasks}/{totalSubtasks} subtasks</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                  <button 
                    onClick={onToggleFlag} 
                    className={`p-1.5 rounded-lg transition-colors ${
                      todo.isFlagged 
                        ? 'text-red-500 bg-red-500/10' 
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <Flag size={14} />
                  </button>
                  <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500"><Edit2 size={14} /></button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500"
                    >
                      <MoreVertical size={14} />
                    </button>
                    <AnimatePresence>
                      {showMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-20 overflow-hidden ${
                              theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            <button onClick={() => { onDuplicate(); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2">
                              <Copy size={14} /> Duplicate
                            </button>
                            <button onClick={() => { onMoveToTop(); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2">
                              <ArrowUp size={14} /> Move to Top
                            </button>
                            <button onClick={() => { onMoveToBottom(); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2">
                              <ArrowDown size={14} /> Move to Bottom
                            </button>
                            <div className={`h-px ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />
                            <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                              <Trash2 size={14} /> Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                  todo.priority === 'High' ? 'text-red-500' : 
                  todo.priority === 'Medium' ? 'text-amber-500' : 
                  'text-blue-500'
                }`}>
                  <AlertCircle size={10} />
                  {todo.priority}
                </div>
                
                {todo.category && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <Tag size={10} />
                    {todo.category}
                  </div>
                )}

                {todo.dueDate && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                    new Date(todo.dueDate) < new Date() && !todo.completed ? 'text-red-500' : 'text-slate-500'
                  }`}>
                    <Calendar size={10} />
                    {new Date(todo.dueDate).toLocaleDateString()}
                  </div>
                )}

                {todo.estimatedTime && todo.estimatedTime > 0 && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <Clock size={10} />
                    {todo.estimatedTime}m
                  </div>
                )}

                {todo.dueDate && todo.reminderMinutes && todo.reminderMinutes > 0 && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                    todo.reminderSent ? 'text-slate-400' : 'text-blue-500'
                  }`}>
                    <Bell size={10} />
                    {todo.reminderMinutes}m reminder
                  </div>
                )}

                {todo.tags && todo.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {todo.tags.map(tag => (
                      <span key={tag} className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        theme === 'dark' ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {(todo.notes || totalSubtasks > 0) && (
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:underline"
                  >
                    <ListTodo size={10} />
                    {isExpanded ? 'Hide Details' : 'Show Details'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && !isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-12 pb-4 space-y-4 ${theme === 'dark' ? 'bg-white/[0.02]' : 'bg-slate-50/50'}`}
          >
            {todo.notes && (
              <div className="space-y-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Notes</div>
                <div className={`text-xs leading-relaxed whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {todo.notes}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Subtasks</div>
              <div className="space-y-1.5">
                {todo.subtasks?.map(st => (
                  <div key={st.id} className="flex items-center justify-between group/st">
                    <button 
                      onClick={() => toggleSubtask(st)}
                      className="flex items-center gap-2 text-xs text-left"
                    >
                      {st.completed ? (
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle size={14} className="text-slate-400 shrink-0" />
                      )}
                      <span className={`${st.completed ? 'line-through text-slate-500' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}`}>
                        {st.title}
                      </span>
                    </button>
                    <button 
                      onClick={() => removeSubtask(st)}
                      className="opacity-0 group-hover/st:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                
                {!todo.completed && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubtask()}
                      placeholder="Add subtask..."
                      className={`flex-1 bg-transparent border-b border-slate-200 dark:border-white/10 text-xs py-1 focus:outline-none focus:border-blue-500 transition-all ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                    <button 
                      onClick={addSubtask}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
