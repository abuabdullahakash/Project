import React, { createContext, useContext, useState, useEffect } from 'react';
import { portfolioData as initialData } from '../data/portfolioData';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export type PortfolioData = typeof initialData;
export type Service = PortfolioData['services'][0];
export type Project = PortfolioData['projects'][0];

interface PortfolioContextType {
  data: PortfolioData;
  isEditMode: boolean;
  setIsEditMode: (mode: boolean) => void;
  updatePersonalInfo: (field: string, value: any) => void;
  addService: (service: Service) => void;
  updateService: (id: string, service: Service) => void;
  deleteService: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Project) => void;
  deleteProject: (id: string) => void;
  saveChanges: () => Promise<void>;
  isLoading: boolean;
  portfolioId: string | null;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children, initialEditMode = false }: { children: React.ReactNode, initialEditMode?: boolean }) {
  const [data, setData] = useState<PortfolioData>(initialData);
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const { user, isConfigured } = useAuth();

  useEffect(() => {
    setIsEditMode(initialEditMode);
  }, [initialEditMode]);

  useEffect(() => {
    if (!isConfigured || !db) {
      // Fallback to local storage if Firebase is not configured
      const saved = localStorage.getItem('portfolioData');
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          const updatedData = { ...parsedData, personalInfo: initialData.personalInfo };
          setData(updatedData);
          localStorage.setItem('portfolioData', JSON.stringify(updatedData));
        } catch (e) {
          console.error('Failed to parse portfolio data', e);
        }
      } else {
        setData(initialData);
      }
      setIsLoading(false);
      return;
    }

    let unsubscribe: () => void;

    const fetchPortfolio = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlPortfolioId = params.get('id');

        if (urlPortfolioId) {
          // Fetch specific portfolio by ID
          const docRef = doc(db, 'portfolios', urlPortfolioId);
          setPortfolioId(urlPortfolioId);
          
          unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              setData(docSnap.data() as PortfolioData);
            } else {
              setData(initialData);
            }
            setIsLoading(false);
          });
        } else if (user) {
          // If logged in, use their own portfolio
          const docRef = doc(db, 'portfolios', user.uid);
          setPortfolioId(user.uid);
          
          unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const currentData = docSnap.data() as PortfolioData;
              // Force update personalInfo with the new CV data from initialData
              const updatedData = { ...currentData, personalInfo: initialData.personalInfo };
              if (JSON.stringify(currentData.personalInfo) !== JSON.stringify(initialData.personalInfo)) {
                setDoc(docRef, updatedData);
              }
              setData(updatedData);
            } else {
              // Initialize with default data
              setDoc(docRef, initialData);
              setData(initialData);
            }
            setIsLoading(false);
          });
        } else {
          // If public, fetch the first portfolio available
          const q = query(collection(db, 'portfolios'), limit(1));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            setPortfolioId(docSnap.id);
            
            unsubscribe = onSnapshot(docSnap.ref, (snap) => {
              if (snap.exists()) {
                setData(snap.data() as PortfolioData);
              }
              setIsLoading(false);
            });
          } else {
            // No portfolio found, use default
            setData(initialData);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error fetching portfolio:", error);
        setIsLoading(false);
      }
    };

    fetchPortfolio();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isConfigured]);

  // Save to local storage as backup whenever data changes
  useEffect(() => {
    localStorage.setItem('portfolioData', JSON.stringify(data));
  }, [data]);

  const updatePersonalInfo = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const addService = (service: Service) => {
    setData(prev => ({ ...prev, services: [...prev.services, service] }));
  };

  const updateService = (id: string, service: Service) => {
    setData(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? service : s)
    }));
  };

  const deleteService = (id: string) => {
    setData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const addProject = (project: Project) => {
    setData(prev => ({ ...prev, projects: [...prev.projects, project] }));
  };

  const updateProject = (id: string, project: Project) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? project : p)
    }));
  };

  const deleteProject = (id: string) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id)
    }));
  };

  const saveChanges = async () => {
    if (isConfigured && db && portfolioId) {
      try {
        const docRef = doc(db, 'portfolios', portfolioId);
        await setDoc(docRef, data);
      } catch (error) {
        console.error("Error saving to Firestore:", error);
        throw error;
      }
    } else {
      // Fallback to local storage
      await new Promise(resolve => setTimeout(resolve, 500));
      localStorage.setItem('portfolioData', JSON.stringify(data));
    }
  };

  return (
    <PortfolioContext.Provider value={{
      data, isEditMode, setIsEditMode,
      updatePersonalInfo, addService, updateService, deleteService,
      addProject, updateProject, deleteProject, saveChanges, isLoading, portfolioId
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within PortfolioProvider');
  return context;
};
