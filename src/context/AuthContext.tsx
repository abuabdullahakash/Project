import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db, isConfigured } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  isConfigured: boolean;
  isAdmin: boolean;
  updateUserProfile: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const updateUserProfile = (data: Partial<UserProfile>) => {
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && db) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          let role: UserRole = 'user';
          let teamId: string | undefined = undefined;
          
          if (userSnap.exists()) {
            role = userSnap.data().role as UserRole;
            teamId = userSnap.data().teamId;
          }
          
          const isUserAdmin = currentUser.email === 'fyt0000012@gmail.com' || role === 'admin';
          if (isUserAdmin) role = 'admin';
          
          setIsAdmin(isUserAdmin);

          const existingData = userSnap.exists() ? userSnap.data() : {};

          const userData: Partial<UserProfile> = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: existingData.displayName || currentUser.displayName || '',
            photoURL: existingData.photoURL || currentUser.photoURL || '',
            lastLoginAt: new Date().toISOString(),
            ...(userSnap.exists() ? {} : { 
              createdAt: new Date().toISOString(),
              role: role
            })
          };
          
          await setDoc(userRef, userData, { merge: true });
          
          // Fetch updated profile
          const updatedSnap = await getDoc(userRef);
          if (updatedSnap.exists()) {
            setUserProfile(updatedSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error saving user data:", error);
        }
      } else {
        setIsAdmin(false);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    if (!auth || !googleProvider) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Sign-in cancelled by user");
        return;
      }
      console.error("Error signing in with Google", error);
    }
  };

  const logOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, logOut, isConfigured, isAdmin, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
