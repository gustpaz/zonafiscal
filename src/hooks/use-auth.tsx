
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  getAuth,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { app } from "@/lib/firebase";
import { createUserInDb, getUserById } from "@/lib/admin-data";
import { notifyNewUser } from "@/lib/slack-notifications";
import { captureAuthError, setUserContext, clearUserContext } from "@/lib/sentry-helpers";
import type { User as CustomUser } from "@/lib/types";

interface AuthContextType {
  user: (User & Partial<CustomUser>) | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<(User & Partial<CustomUser>) | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  const loadUserData = async (firebaseUser: User) => {
    try {
      const userData = await getUserById(firebaseUser.uid);
      if (userData) {
        // Mesclar dados do Firebase Auth com dados do Firestore
        setUser({ ...firebaseUser, ...userData });
        setUserContext({
          id: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          name: userData.name,
          plan: userData.plan,
        });
      } else {
        setUser(firebaseUser);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setUser(firebaseUser);
    }
  };

  const refreshUserData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await loadUserData(currentUser);
    }
  };

  const handleUserCreation = async (firebaseUser: User) => {
    // Get tracking info from localStorage
    const utmSource = localStorage.getItem('utm_source');
    const utmMedium = localStorage.getItem('utm_medium');
    const utmCampaign = localStorage.getItem('utm_campaign');
    const utmContent = localStorage.getItem('utm_content');
    const utmTerm = localStorage.getItem('utm_term');
    
    const trackingData: { 
      utmSource?: string; 
      utmMedium?: string; 
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
    } = {};
    if (utmSource) trackingData.utmSource = utmSource;
    if (utmMedium) trackingData.utmMedium = utmMedium;
    if (utmCampaign) trackingData.utmCampaign = utmCampaign;
    if (utmContent) trackingData.utmContent = utmContent;
    if (utmTerm) trackingData.utmTerm = utmTerm;

    await createUserInDb(firebaseUser, trackingData);

    // Notificar novo usuário no Slack
    await notifyNewUser(
      firebaseUser.displayName || 'Novo Usuário',
      firebaseUser.email || '',
      utmSource || undefined
    );

    // Clean up localStorage
    localStorage.removeItem('utm_source');
    localStorage.removeItem('utm_medium');
    localStorage.removeItem('utm_campaign');
    localStorage.removeItem('utm_content');
    localStorage.removeItem('utm_term');
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUser(null);
        clearUserContext();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const signUpWithEmail = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const name = email.split('@')[0];
    await updateProfile(userCredential.user, { displayName: name });
    await handleUserCreation(userCredential.user);
    return userCredential;
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      captureAuthError(error as Error, { email, action: 'login' });
      throw error;
    }
  };
  
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    // Check if the user is new to create them in our DB
    const userDoc = await getUserById(result.user.uid);
    if (!userDoc) {
      await handleUserCreation(result.user);
    }
    return result;
  };

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  const value = {
    user,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
