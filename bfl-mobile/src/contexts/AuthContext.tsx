/**
 * BFL Fitness Mobile — Authentication Context
 * Uses Firebase Auth with AsyncStorage persistence.
 * Mirrors the web app's auth flow exactly.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from '../services/firebase';
import {
  getUserProfile,
  saveUserProfile,
  subscribeToUserProfile,
} from '../services/firestoreService';
import type { UserProfile, UserRole } from '../types';
import type { FirebaseUser } from '../services/firebase';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (email: string, password: string, name: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Try to load profile from Firestore
        const profile = await getUserProfile(fbUser.uid);
        if (profile) {
          setUser(profile);
        } else {
          // Create basic profile if it doesn't exist (first mobile login)
          const newProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Athlete',
            role: 'client',
            photoURL: fbUser.photoURL || undefined,
            createdAt: new Date().toISOString(),
            hasCompletedIntake: false,
          };
          await saveUserProfile(fbUser.uid, newProfile);
          setUser(newProfile);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to real-time profile updates when authenticated
  useEffect(() => {
    if (!firebaseUser) return;

    const unsub = subscribeToUserProfile(firebaseUser.uid, (profile) => {
      if (profile) setUser(profile);
    });

    return () => unsub();
  }, [firebaseUser]);

  const signIn = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(credential.user.uid);
    if (profile) {
      setUser(profile);
      return profile;
    }
    // Fallback: create profile
    const fallback: UserProfile = {
      uid: credential.user.uid,
      email: credential.user.email || email,
      displayName: credential.user.displayName || email.split('@')[0],
      role: 'client',
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(credential.user.uid, fallback);
    setUser(fallback);
    return fallback;
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<UserProfile> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const newProfile: UserProfile = {
      uid: credential.user.uid,
      email,
      displayName: name,
      role: 'client',
      createdAt: new Date().toISOString(),
      hasCompletedIntake: false,
      status: 'pending',
    };
    await saveUserProfile(credential.user.uid, newProfile);
    setUser(newProfile);
    return newProfile;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const role = user?.role || 'client';

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
