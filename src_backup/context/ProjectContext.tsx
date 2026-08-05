import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Project } from '../types';
import { db, isConfigured } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where, deleteField, or, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { sendEmailNotification } from '../utils/emailUtils';

interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  touchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  addProject: (projectData: Omit<Project, 'id' | 'createdAt' | 'lastUpdatedAt' | 'notes'>) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const [localProjects, setLocalProjects] = useLocalStorage<Project[]>('dpcc_projects', []);
  const [firebaseProjects, setFirebaseProjects] = useState<Project[]>([]);

  const projects = isConfigured && user ? firebaseProjects : localProjects;

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

    let unsubscribe: () => void;

    if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
      const q = query(collection(db, 'projects'));
      unsubscribe = onSnapshot(q, async (snapshot) => {
        const projectsData: Project[] = [];
        snapshot.forEach((doc) => {
          projectsData.push(doc.data() as Project);
        });
        
        if (localProjects.length > 0) {
          let syncedAny = false;
          for (const localProj of localProjects) {
            if (!projectsData.find(p => p.id === localProj.id)) {
              let projectWithUser: any = { ...localProj, userId: user.uid };
              projectWithUser = deepCleanUndefined(projectWithUser);
              await setDoc(doc(db, 'projects', localProj.id), projectWithUser);
              syncedAny = true;
            }
          }
          setLocalProjects([]); 
          if (syncedAny) return;
        }
        setFirebaseProjects(projectsData);
      });
    } else {
      // For regular users, we fetch projects using an 'or' query
      // First, we need to know which teams the user is a part of to fetch team projects
      let userTeamIds: string[] = [];
      
      let isMounted = true;
      let snapshotUnsubscribe: (() => void) | undefined;

      const setupProjectsListener = () => {
        if (!isMounted) return;
        
        // Fetch projects where user is owner or assigned
        const q1 = query(
          collection(db, 'projects'),
          or(
            where('userId', '==', user.uid),
            where('assignedTo', '==', user.uid),
            where('assignedBy', '==', user.uid)
          )
        );

        snapshotUnsubscribe = onSnapshot(q1, async (snapshot) => {
          let projectsData: Project[] = [];
          snapshot.forEach((doc) => {
            projectsData.push(doc.data() as Project);
          });
          
          // If user is in teams, we should also fetch projects for those teams
          if (userTeamIds.length > 0) {
            // Chunk team IDs into arrays of 10 for 'in' queries
            const chunks = [];
            for (let i = 0; i < userTeamIds.length; i += 10) {
              chunks.push(userTeamIds.slice(i, i + 10));
            }
            
            for (const chunk of chunks) {
              const teamProjectsQuery = query(collection(db, 'projects'), where('teamId', 'in', chunk));
              const teamSnapshot = await getDocs(teamProjectsQuery);
              teamSnapshot.forEach((doc) => {
                const p = doc.data() as Project;
                if (!projectsData.find(existing => existing.id === p.id)) {
                  projectsData.push(p);
                }
              });
            }
          }
          
          if (localProjects.length > 0) {
            let syncedAny = false;
            for (const localProj of localProjects) {
              if (!projectsData.find(p => p.id === localProj.id)) {
                let projectWithUser: any = { ...localProj, userId: user.uid };
                projectWithUser = deepCleanUndefined(projectWithUser);
                await setDoc(doc(db, 'projects', localProj.id), projectWithUser);
                syncedAny = true;
              }
            }
            setLocalProjects([]); 
            if (syncedAny) return;
          }
          if (isMounted) {
            setFirebaseProjects(projectsData);
          }
        }, (error) => {
          console.error("Error fetching projects:", error);
        });
      };

      // Fetch user's teams first
      import('firebase/firestore').then(({ getDocs, collection, query, where, onSnapshot }) => {
        if (!isMounted) return;
        const teamsQuery = query(collection(db, 'teams'), where('allMembers', 'array-contains', user.uid));
        
        // Listen to teams changes to update userTeamIds
        const teamsUnsubscribe = onSnapshot(teamsQuery, (teamsSnapshot) => {
          userTeamIds = teamsSnapshot.docs.map(doc => doc.id);
          
          // Re-run setupProjectsListener when teams change
          if (snapshotUnsubscribe) {
            snapshotUnsubscribe();
          }
          setupProjectsListener();
        }, (error) => {
          console.error("Error fetching user teams:", error);
          setupProjectsListener(); // Fallback to just user's projects
        });

        // Add teamsUnsubscribe to the cleanup function
        const originalUnsubscribe = unsubscribe;
        unsubscribe = () => {
          isMounted = false;
          if (originalUnsubscribe) originalUnsubscribe();
          teamsUnsubscribe();
          if (snapshotUnsubscribe) snapshotUnsubscribe();
        };
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userProfile]);

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const updateLogic = (p: Project) => {
      if (p.id === id) {
        const newProject = { ...p, ...updates, lastUpdatedAt: new Date().toISOString() };
        if (updates.status === 'Delivered' && p.status !== 'Delivered') {
          newProject.deliveredAt = new Date().toISOString();
        } else if (updates.status && updates.status !== 'Delivered') {
          delete newProject.deliveredAt;
        }
        
        // Ensure additionalLinks is preserved if not explicitly updated
        if (updates.additionalLinks !== undefined) {
          newProject.additionalLinks = updates.additionalLinks;
        }
        
        return newProject;
      }
      return p;
    };

    const deepCleanUndefined = (obj: any): any => {
      if (obj === undefined) return undefined;
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      
      // Preserve Firestore FieldValue objects (they have custom prototypes)
      if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== Array.prototype) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(deepCleanUndefined).filter(item => item !== undefined);
      }
      
      const cleaned: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const val = deepCleanUndefined(obj[key]);
          if (val !== undefined) {
            cleaned[key] = val;
          }
        }
      }
      return cleaned;
    };

    try {
      if (isConfigured && user && db) {
        const projectToUpdate = firebaseProjects.find(p => p.id === id);
        if (projectToUpdate) {
          const updatedProject = updateLogic(projectToUpdate);
          let firestoreData: any = { ...updatedProject };
          
          if (updates.status && updates.status !== 'Delivered' && projectToUpdate.status === 'Delivered') {
            firestoreData.deliveredAt = deleteField();
          }
          
          firestoreData = deepCleanUndefined(firestoreData);

          console.log("Updating project in Firestore:", id, firestoreData);
          await setDoc(doc(db, 'projects', id), firestoreData, { merge: true });
          console.log("Update successful");

          // Send email notification if marked as delivered
          if (updates.status === 'Delivered' && projectToUpdate.status !== 'Delivered' && projectToUpdate.clientEmail) {
            const subject = `Project Delivered: ${projectToUpdate.title}`;
            const html = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hello ${projectToUpdate.clientName},</h2>
                <p>Great news! Your project <strong>${projectToUpdate.title}</strong> has been marked as delivered.</p>
                <p>Thank you for working with us.</p>
              </div>
            `;
            sendEmailNotification(projectToUpdate.clientEmail, subject, html);
          }
        } else {
          console.error("Project not found in firebaseProjects:", id);
        }
      } else {
        const projectToUpdate = localProjects.find(p => p.id === id);
        setLocalProjects(prev => prev.map(updateLogic));
        
        if (projectToUpdate && updates.status === 'Delivered' && projectToUpdate.status !== 'Delivered' && projectToUpdate.clientEmail) {
          const subject = `Project Delivered: ${projectToUpdate.title}`;
          const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${projectToUpdate.clientName},</h2>
              <p>Great news! Your project <strong>${projectToUpdate.title}</strong> has been marked as delivered.</p>
              <p>Thank you for working with us.</p>
            </div>
          `;
          sendEmailNotification(projectToUpdate.clientEmail, subject, html);
        }
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project. Please check the console for details.");
    }
  };

  const touchProject = (id: string) => {
    updateProject(id, {});
  };

  const deleteProject = async (id: string) => {
    if (isConfigured && user && db) {
      await deleteDoc(doc(db, 'projects', id));
    } else {
      setLocalProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const addProject = async (projectData: any) => {
    const newProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      notes: [],
      additionalLinks: projectData.additionalLinks || [],
    };
    
    if (projectData.status === 'Delivered') {
      newProject.deliveredAt = new Date().toISOString();
    }

    const deepCleanUndefined = (obj: any): any => {
      if (obj === undefined) return undefined;
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      
      // Preserve Firestore FieldValue objects (they have custom prototypes)
      if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== Array.prototype) {
        return obj;
      }
      
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

    try {
      if (isConfigured && user && db) {
        let projectWithUser: any = { ...newProject, userId: user.uid };
        projectWithUser = deepCleanUndefined(projectWithUser);
        await setDoc(doc(db, 'projects', newProject.id), projectWithUser);
      } else {
        setLocalProjects(prev => [...prev, newProject]);
      }
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Failed to add project. Please check the console for details.");
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      setProjects: isConfigured && user ? setFirebaseProjects : setLocalProjects, 
      updateProject, 
      touchProject, 
      deleteProject,
      addProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}

