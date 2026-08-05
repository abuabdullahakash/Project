import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { GlobalNote } from '../types';
import { db, isConfigured } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface GlobalNotesContextType {
  notes: GlobalNote[];
  addNote: (note: Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, updates: Partial<Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteNote: (id: string) => void;
}

const GlobalNotesContext = createContext<GlobalNotesContextType | undefined>(undefined);

export function GlobalNotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [localNotes, setLocalNotes] = useLocalStorage<GlobalNote[]>('globalNotes', []);
  const [firebaseNotes, setFirebaseNotes] = useState<GlobalNote[]>([]);

  const notes = isConfigured && user ? firebaseNotes : localNotes;

  useEffect(() => {
    if (!isConfigured || !user || !db) return;

    const deepCleanUndefined = (obj: any): any => {
      if (obj === undefined) return undefined;
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== Array.prototype) return obj;
      if (Array.isArray(obj)) return obj.map(deepCleanUndefined).filter(item => item !== undefined);
      const cleaned: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const val = deepCleanUndefined(obj[key]);
          if (val !== undefined) cleaned[key] = val;
        }
      }
      return cleaned;
    };

    const q = query(collection(db, 'globalNotes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const notesData: GlobalNote[] = [];
      snapshot.forEach((doc) => {
        notesData.push(doc.data() as GlobalNote);
      });
      
      // Sync local notes to Firebase if they don't exist there yet
      if (localNotes.length > 0) {
        let syncedAny = false;
        for (const localNote of localNotes) {
          if (!notesData.find(n => n.id === localNote.id)) {
            let noteWithUser: any = { ...localNote, userId: user.uid };
            noteWithUser = deepCleanUndefined(noteWithUser);
            await setDoc(doc(db, 'globalNotes', localNote.id), noteWithUser);
            syncedAny = true;
          }
        }
        
        setLocalNotes([]); 
        
        if (syncedAny) {
          return;
        }
      }

      setFirebaseNotes(notesData);
    });

    return () => unsubscribe();
  }, [user]);

  const addNote = async (noteData: Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: GlobalNote = {
      ...noteData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const deepCleanUndefined = (obj: any): any => {
      if (obj === undefined) return undefined;
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== Array.prototype) return obj;
      if (Array.isArray(obj)) return obj.map(deepCleanUndefined).filter(item => item !== undefined);
      const cleaned: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const val = deepCleanUndefined(obj[key]);
          if (val !== undefined) cleaned[key] = val;
        }
      }
      return cleaned;
    };

    if (isConfigured && user && db) {
      let noteWithUser: any = { ...newNote, userId: user.uid };
      noteWithUser = deepCleanUndefined(noteWithUser);
      await setDoc(doc(db, 'globalNotes', newNote.id), noteWithUser);
    } else {
      setLocalNotes(prev => [newNote, ...prev]);
    }
  };

  const updateNote = async (id: string, updates: Partial<Omit<GlobalNote, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updateLogic = (n: GlobalNote) => {
      if (n.id === id) {
        return { ...n, ...updates, updatedAt: new Date().toISOString() };
      }
      return n;
    };

    const deepCleanUndefined = (obj: any): any => {
      if (obj === undefined) return undefined;
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== Array.prototype) return obj;
      if (Array.isArray(obj)) return obj.map(deepCleanUndefined).filter(item => item !== undefined);
      const cleaned: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const val = deepCleanUndefined(obj[key]);
          if (val !== undefined) cleaned[key] = val;
        }
      }
      return cleaned;
    };

    if (isConfigured && user && db) {
      const noteToUpdate = firebaseNotes.find(n => n.id === id);
      if (noteToUpdate) {
        let updatedNote: any = updateLogic(noteToUpdate);
        updatedNote = deepCleanUndefined(updatedNote);
        await setDoc(doc(db, 'globalNotes', id), updatedNote, { merge: true });
      }
    } else {
      setLocalNotes(prev => prev.map(updateLogic));
    }
  };

  const deleteNote = async (id: string) => {
    if (isConfigured && user && db) {
      await deleteDoc(doc(db, 'globalNotes', id));
    } else {
      setLocalNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <GlobalNotesContext.Provider value={{ notes, addNote, updateNote, deleteNote }}>
      {children}
    </GlobalNotesContext.Provider>
  );
}

export function useGlobalNotesContext() {
  const context = useContext(GlobalNotesContext);
  if (context === undefined) {
    throw new Error('useGlobalNotesContext must be used within a GlobalNotesProvider');
  }
  return context;
}
