import { useState, useEffect } from 'react';
import { GlobalNote } from '../types';

export function useGlobalNotes() {
  const [notes, setNotes] = useState<GlobalNote[]>(() => {
    const saved = localStorage.getItem('globalNotes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('globalNotes', JSON.stringify(notes));
  }, [notes]);

  const addNote = (note: Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: GlobalNote = {
      ...note,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
  };

  const updateNote = (id: string, updates: Partial<Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>>) => {
    setNotes(prev => prev.map(note => 
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date().toISOString() }
        : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  return {
    notes,
    addNote,
    updateNote,
    deleteNote
  };
}
