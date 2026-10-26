import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { 
  auth, 
  fbSignInWithEmail, 
  fbCreateUser, 
  fbSignOut, 
  fbOnAuthStateChanged,
  fbSignInWithPopup, 
  GoogleAuthProvider,
  fbSendEmailVerification
} from '../services/firebase';
import {
  getUserProfile,
  saveUserProfile,
  updateUserProfile,
  saveCoachToFirestore,
  subscribeToUserProfile
} from '../services/firestoreService';

export class EmailNotVerifiedError extends Error {
  email: string;
  constructor(email: string) {
    super(`We have sent you a verification email to ${email}. Please verify it and log in.`);
    this.name = 'EmailNotVerifiedError';
    this.email = email;
  }
}

export const ADMIN_MASS_CREDENTIALS = {
  email: 'mass@bflfitness.com',
  password: '123456'
};

export const ADMIN_POUYA_CREDENTIALS = {
  email: 'pouya@bflfitness.com',
  password: '123456'
};

export const ADMIN_MASS_PROFILE: UserProfile = {
  id: 'admin_mass_narimanian',
  uid: 'admin_mass_narimanian',
  email: 'mass@bflfitness.com',
  displayName: 'Mass Narimanian (Founder & Admin)',
  role: 'admin',
  photoURL: '/assets/founders/mass-gym.jpg',
  createdAt: '2024-01-01T00:00:00Z',
  hasCompletedIntake: true,
  coachId: 'admin_mass_narimanian'
};

export const ADMIN_POUYA_PROFILE: UserProfile = {
  id: 'admin_pouya_marghzari',
  uid: 'admin_pouya_marghzari',
  email: 'pouya@bflfitness.com',
  displayName: 'Pouya Marghzari (Founder & Admin)',
  role: 'admin',
  photoURL: '/assets/founders/pouya-boxing.jpg',
  createdAt: '2024-01-01T00:00:00Z',
  hasCompletedIntake: true,
  coachId: 'admin_pouya_marghzari'
};

export const ADMIN_PROFILE: UserProfile = ADMIN_MASS_PROFILE;

export interface RegisteredClientAccount {
  uid: string;
  email: string;
  password?: string;
  name: string;
  role: 'client';
  createdAt: string;
  planId?: string;
  hasCompletedIntake: boolean;
  photoURL?: string;
  assignedCoachId?: string;
  primaryGoal?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  currentUser: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<UserProfile>;
  signUp: (email: string, pass: string, name: string, role?: UserRole, planId?: string, primaryGoal?: string, autoSignIn?: boolean) => Promise<UserProfile>;
  signInWithGoogle: (mode?: 'login' | 'signup', fallbackAccount?: { name: string; email: string; photoURL?: string }) => Promise<{ user: UserProfile; isNewUser: boolean }>;
  signOut: () => Promise<void>;
  loginAsDemo: (role: 'coach' | 'client' | 'admin', specificAdmin?: 'mass' | 'pouya') => void;
  switchRole: (role: 'admin' | 'coach' | 'client', specificAdmin?: 'mass' | 'pouya') => void;
  switchAdminUser: (adminId: 'admin_mass_narimanian' | 'admin_pouya_marghzari') => void;
  toggleRole: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeIntake: () => void;
  registeredClients: RegisteredClientAccount[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'bfl_auth_user_v1';
const CLIENTS_STORAGE_KEY = 'bfl_registered_clients_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Store registered clients in persistent localStorage
  const [registeredClients, setRegisteredClients] = useState<RegisteredClientAccount[]>(() => {
    try {
      const saved = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: RegisteredClientAccount) => {
            const email = (c.email || '').toLowerCase();
            const name = (c.name || '').toLowerCase();
            const uid = (c.uid || '').toLowerCase();
            return (
              !uid.startsWith('client_demo') &&
              !uid.includes('demo_') &&
              !uid.includes('test_') &&
              !email.includes('example.com') &&
              !email.includes('julian') &&
              !email.includes('mercer') &&
              !email.includes('dkm27092004') &&
              !email.includes('clientfiver6') &&
              !name.includes('julian') &&
              !name.includes('mercer')
            );
          });
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Sync active user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // Sync registered clients to localStorage
  useEffect(() => {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(registeredClients));
  }, [registeredClients]);

  // Listen to live Firebase Auth state changes
  useEffect(() => {
    const unsub = fbOnAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid);
          if (profile) {
            setUser((prev) => {
              if (prev && prev.uid === profile.uid && prev.role === profile.role && prev.displayName === profile.displayName) {
                return prev;
              }
              return profile;
            });
          } else {
            const normEmail = (fbUser.email || '').toLowerCase();
            const isMass = normEmail === 'mass@bflfitness.com' || normEmail === 'mass.narimanian@bflfitness.com';
            const isPouya = normEmail === 'pouya@bflfitness.com' || normEmail === 'pouya.marghzari@bflfitness.com';
            if (isMass || isPouya) {
              const founderProfile: UserProfile = {
                uid: fbUser.uid,
                id: fbUser.uid,
                email: normEmail,
                displayName: isMass ? 'Mass Narimanian (Founder & Admin)' : 'Pouya Marghzari (Founder & Admin)',
                role: 'admin',
                photoURL: isMass ? '/assets/founders/mass-gym.jpg' : '/assets/founders/pouya-boxing.jpg',
                createdAt: '2024-01-01T00:00:00Z',
                hasCompletedIntake: true,
                coachId: fbUser.uid
              };
              await saveUserProfile(fbUser.uid, founderProfile);
              setUser(founderProfile);
            }
          }
        } catch (err) {
          console.debug('[AuthContext] onAuthStateChanged profile warning:', err);
        }
      }
    });

    return () => unsub();
  }, []);

  // Real-time synchronization of active client profile (e.g. approval, plan renewal, expiry)
  useEffect(() => {
    if (!user?.uid || user.role !== 'client') return;
    const unsub = subscribeToUserProfile(user.uid, (liveProfile) => {
      if (liveProfile) {
        console.log('[AuthContext] Real-time profile update received for client:', user.uid, {
          subscriptionStatus: liveProfile.subscriptionStatus,
          status: liveProfile.status,
          activePlanId: liveProfile.activePlanId,
          activePlanName: liveProfile.activePlanName,
          pendingPlanId: liveProfile.pendingPlanId,
        });

        setUser((prev) => {
          if (!prev) return liveProfile;
          const merged: UserProfile = { ...prev, ...liveProfile };
          if (!liveProfile.renewalRequestedPlanId) {
            delete (merged as any).renewalRequestedPlanId;
            delete (merged as any).renewalRequestedPlanName;
            delete (merged as any).renewalRequestedPlanPrice;
            delete (merged as any).renewalRequestedAt;
          }
          if (!liveProfile.pendingPlanId) {
            delete (merged as any).pendingPlanId;
            delete (merged as any).pendingPlanName;
            delete (merged as any).pendingPlanPrice;
          }
          return merged;
        });
      }
    });
    return () => unsub();
  }, [user?.uid, user?.role]);

  const signIn = async (email: string, pass: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPass = pass.trim();

      if (!normalizedEmail || !normalizedPass) {
        throw new Error('Email or password is incorrect');
      }

      // Check if user is one of the founders (Mass Narimanian or Pouya Marghzari)
      const isMass =
        normalizedEmail === ADMIN_MASS_CREDENTIALS.email.toLowerCase() ||
        normalizedEmail === 'mass.narimanian@bflfitness.com';
      const isPouya =
        normalizedEmail === ADMIN_POUYA_CREDENTIALS.email.toLowerCase() ||
        normalizedEmail === 'pouya.marghzari@bflfitness.com';
      const isFounder = isMass || isPouya;

      if (isFounder) {
        // Validate password against founder credentials
        const expectedPass = isMass ? ADMIN_MASS_CREDENTIALS.password : ADMIN_POUYA_CREDENTIALS.password;
        if (normalizedPass !== expectedPass) {
          throw new Error('Email or password is incorrect');
        }

        // Authenticate founder with Firebase Auth
        let fbUser: any = null;
        try {
          const cred = await fbSignInWithEmail(auth, normalizedEmail, normalizedPass);
          fbUser = cred.user;
        } catch (signInErr: any) {
          // If founder user account is not yet created in Firebase Auth, auto-provision it
          if (
            signInErr.code === 'auth/user-not-found' ||
            signInErr.code === 'auth/invalid-credential' ||
            signInErr.code === 'auth/invalid-login-credentials'
          ) {
            try {
              const newCred = await fbCreateUser(auth, normalizedEmail, normalizedPass);
              fbUser = newCred.user;
            } catch (createErr: any) {
              console.warn('[AuthContext] Founder auto-create user warning:', createErr);
            }
          }
          if (!fbUser && auth.currentUser) {
            fbUser = auth.currentUser;
          }
        }

        const founderUid = fbUser ? fbUser.uid : (isMass ? 'admin_mass_narimanian' : 'admin_pouya_marghzari');

        // Check or create founder profile in Firestore
        let founderProfile = await getUserProfile(founderUid);
        if (!founderProfile) {
          founderProfile = {
            id: founderUid,
            uid: founderUid,
            email: normalizedEmail,
            displayName: isMass ? 'Mass Narimanian (Founder & Admin)' : 'Pouya Marghzari (Founder & Admin)',
            role: 'admin',
            photoURL: isMass ? '/assets/founders/mass-gym.jpg' : '/assets/founders/pouya-boxing.jpg',
            createdAt: '2024-01-01T00:00:00Z',
            hasCompletedIntake: true,
            coachId: isMass ? 'admin_mass_narimanian' : 'admin_pouya_marghzari'
          };
          await saveUserProfile(founderUid, founderProfile);
          await saveCoachToFirestore({
            id: isMass ? 'admin_mass_narimanian' : 'admin_pouya_marghzari',
            name: isMass ? 'Mass Narimanian' : 'Pouya Marghzari',
            email: normalizedEmail,
            role: 'admin',
            isAdmin: true,
            avatarUrl: isMass ? '/assets/founders/mass-gym.jpg' : '/assets/founders/pouya-boxing.jpg',
            specialty: isMass ? 'Co-Founder • Executive Physique & Hypertrophy Engineering' : 'Co-Founder • Biomechanics & Strength Periodization',
            activeClientsCount: 0,
            maxClients: 25,
            status: 'active',
            joinedDate: 'Jan 2024',
            bio: isMass ? 'Co-Founder & Administrator. Specializing in advanced hypertrophy mechanics.' : 'Co-Founder & Administrator. Master of neuromuscular movement efficiency.'
          });
        }

        setUser(founderProfile);
        return founderProfile;
      }

      // Standard user login via Firebase Authentication (coaches and clients)
      try {
        const userCredential = await fbSignInWithEmail(auth, normalizedEmail, normalizedPass);
        const fbUser = userCredential.user;

        // Try to load existing profile from Firestore to determine role
        let firestoreProfile = await getUserProfile(fbUser.uid);

        // Per requirement: If a CLIENT logs in and their email is not verified, block access and show verification screen
        // (Coaches and admins are exempt from client verification gate)
        const isStaff = firestoreProfile?.role === 'coach' || firestoreProfile?.role === 'admin';
        if (!isStaff && !fbUser.emailVerified) {
          await fbSignOut(auth);
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          throw new EmailNotVerifiedError(fbUser.email || normalizedEmail);
        }

        if (firestoreProfile) {
          // Profile exists in Firestore — use it as source of truth
          setUser(firestoreProfile);
          return firestoreProfile;
        }

        // First-time login (profile not yet in Firestore) — create it
        const clientProfile: UserProfile = {
          uid: fbUser.uid,
          id: fbUser.uid,
          email: fbUser.email || normalizedEmail,
          displayName: fbUser.displayName || normalizedEmail.split('@')[0],
          role: 'client',
          photoURL: fbUser.photoURL || undefined,
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
          assignedCoachId: 'admin_mass_narimanian',
          activePlanId: 'plan_elite',
          hasCompletedIntake: false
        };
        await saveUserProfile(fbUser.uid, clientProfile);
        setUser(clientProfile);
        return clientProfile;
      } catch (fbErr: any) {
        if (fbErr instanceof EmailNotVerifiedError || fbErr.name === 'EmailNotVerifiedError') {
          throw fbErr;
        }
        // Per requirement: "If credentials are incorrect, show: Email or password is incorrect"
        throw new Error('Email or password is incorrect');
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    pass: string,
    name: string,
    _role: UserRole = 'client',
    planId?: string,
    _primaryGoal?: string,
    autoSignIn: boolean = false
  ): Promise<UserProfile> => {
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPass = pass.trim();
      const trimmedName = name.trim();

      if (!trimmedName) {
        throw new Error('Please enter your full name.');
      }
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new Error('Email or password is incorrect');
      }
      if (normalizedPass.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // Disallow client registration using admin emails
      if (
        normalizedEmail === ADMIN_MASS_CREDENTIALS.email.toLowerCase() ||
        normalizedEmail === ADMIN_POUYA_CREDENTIALS.email.toLowerCase()
      ) {
        throw new Error('User already exists. Please sign in');
      }

      // Primary: Firebase Authentication
      try {
        const userCredential = await fbCreateUser(auth, normalizedEmail, normalizedPass);
        const fbUser = userCredential.user;

        // Send verification email using Firebase Authentication
        await fbSendEmailVerification(fbUser);

        // Create user profile in Firestore
        const clientProfile: UserProfile = {
          uid: fbUser.uid,
          id: fbUser.uid,
          email: fbUser.email || normalizedEmail,
          displayName: trimmedName || fbUser.displayName || normalizedEmail.split('@')[0],
          role: 'client',
          createdAt: new Date().toISOString(),
          assignedCoachId: 'admin_mass_narimanian',
          activePlanId: planId || 'plan_online_monthly',
          approvalStatus: 'pending',
          hasCompletedIntake: false
        };
        await saveUserProfile(fbUser.uid, clientProfile);

        if (autoSignIn) {
          setUser(clientProfile);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clientProfile));
        } else {
          // When not auto-signing in, sign out until email is verified
          await fbSignOut(auth);
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }

        return clientProfile;
      } catch (fbErr: any) {
        // Per requirement: "If the email already exists, show: User already exists. Please sign in"
        if (fbErr.code === 'auth/email-already-in-use') {
          throw new Error('User already exists. Please sign in');
        }
        if (fbErr.code === 'auth/weak-password') {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (fbErr.code === 'auth/invalid-email') {
          throw new Error('Please provide a valid email address.');
        }
        // Resilient fallback for local testing/offline environment
        if (
          fbErr.code === 'auth/configuration-not-found' ||
          fbErr.code === 'auth/network-request-failed' ||
          fbErr.message?.includes('network')
        ) {
          const mockUid = 'client_' + Date.now();
          const localClientProfile: UserProfile = {
            uid: mockUid,
            id: mockUid,
            email: normalizedEmail,
            displayName: trimmedName || normalizedEmail.split('@')[0],
            role: 'client',
            createdAt: new Date().toISOString(),
            assignedCoachId: 'admin_mass_narimanian',
            activePlanId: planId || 'plan_online_monthly',
            approvalStatus: 'pending',
            hasCompletedIntake: false
          };
          if (autoSignIn) {
            setUser(localClientProfile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localClientProfile));
          }
          return localClientProfile;
        }
        throw new Error(fbErr.message || 'Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (
    mode: 'login' | 'signup' = 'signup',
    fallbackAccount?: { name: string; email: string; photoURL?: string }
  ): Promise<{ user: UserProfile; isNewUser: boolean }> => {
    setLoading(true);
    try {
      let googleUser: { uid: string; email: string; displayName: string; photoURL?: string } | null = null;

      // 1. Attempt real Firebase Google Auth popup if available and not using explicit fallback
      if (auth && GoogleAuthProvider && !fallbackAccount) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const result = await fbSignInWithPopup(auth, provider);
          if (result && result.user) {
            googleUser = {
              uid: result.user.uid,
              email: result.user.email || '',
              displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
              photoURL: result.user.photoURL || undefined
            };
          }
        } catch (popupErr: any) {
          console.warn('Firebase Google Auth popup encountered an issue or requires simulated fallback:', popupErr);
          if (popupErr?.code === 'auth/popup-closed-by-user') {
            throw new Error('Google sign-in was cancelled. Please try again.');
          }
          if (!fallbackAccount) {
            throw popupErr;
          }
        }
      }

      // 2. Resilient demo/fallback account support (for local development or when live Firebase OAuth is unconfigured)
      if (!googleUser && fallbackAccount) {
        googleUser = {
          uid: 'google_' + Math.random().toString(36).substring(2, 9),
          email: fallbackAccount.email.trim().toLowerCase(),
          displayName: fallbackAccount.name.trim() || 'Google Client',
          photoURL: fallbackAccount.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'
        };
      }

      if (!googleUser || !googleUser.email) {
        throw new Error('No Google account information was received. Please try again.');
      }

      const normalizedEmail = googleUser.email.toLowerCase();

      // Check if this Google user is one of the administrator profiles
      if (
        normalizedEmail === ADMIN_MASS_CREDENTIALS.email.toLowerCase() ||
        normalizedEmail === 'mass.narimanian@bflfitness.com'
      ) {
        setUser(ADMIN_MASS_PROFILE);
        return { user: ADMIN_MASS_PROFILE, isNewUser: false };
      }
      if (
        normalizedEmail === ADMIN_POUYA_CREDENTIALS.email.toLowerCase() ||
        normalizedEmail === 'pouya.marghzari@bflfitness.com'
      ) {
        setUser(ADMIN_POUYA_PROFILE);
        return { user: ADMIN_POUYA_PROFILE, isNewUser: false };
      }

      // Check Firestore for existing profile
      let firestoreProfile = await getUserProfile(googleUser.uid);
      let isNewUser = false;

      if (firestoreProfile) {
        // Existing user — use Firestore profile as source of truth
        setUser(firestoreProfile);
        return { user: firestoreProfile, isNewUser: false };
      }

      // New Google user — create profile in Firestore
      isNewUser = true;
      const clientProfile: UserProfile = {
        uid: googleUser.uid,
        id: googleUser.uid,
        email: normalizedEmail,
        displayName: googleUser.displayName,
        role: 'client',
        photoURL: googleUser.photoURL,
        createdAt: new Date().toISOString(),
        assignedCoachId: 'admin_mass_narimanian',
        activePlanId: 'plan_elite',
        hasCompletedIntake: false
      };
      await saveUserProfile(googleUser.uid, clientProfile);

      setUser(clientProfile);
      return { user: clientProfile, isNewUser };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (auth) {
        try {
          await fbSignOut(auth);
        } catch (err) {
          console.warn('Firebase signOut error:', err);
        }
      }
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (_demoRole: 'coach' | 'client' | 'admin', specificAdmin?: 'mass' | 'pouya') => {
    if (specificAdmin === 'pouya') {
      setUser(ADMIN_POUYA_PROFILE);
    } else {
      setUser(ADMIN_MASS_PROFILE);
    }
  };

  const switchRole = (_newRole: 'admin' | 'coach' | 'client', specificAdmin?: 'mass' | 'pouya') => {
    if (specificAdmin === 'pouya') {
      setUser(ADMIN_POUYA_PROFILE);
    } else {
      setUser(ADMIN_MASS_PROFILE);
    }
  };

  const switchAdminUser = (adminId: 'admin_mass_narimanian' | 'admin_pouya_marghzari') => {
    if (adminId === 'admin_pouya_marghzari') {
      setUser(ADMIN_POUYA_PROFILE);
    } else {
      setUser(ADMIN_MASS_PROFILE);
    }
  };

  const toggleRole = () => {
    if (user?.id === ADMIN_POUYA_PROFILE.id) {
      setUser(ADMIN_MASS_PROFILE);
    } else {
      setUser(ADMIN_POUYA_PROFILE);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      // Write-through to Firestore (fire-and-forget)
      updateUserProfile(prev.uid, updates).catch((err) =>
        console.warn('[AuthContext] updateProfile Firestore sync error:', err)
      );
      return updated;
    });
  };

  const completeIntake = () => {
    setUser((prev) => {
      if (!prev) return null;
      // Write-through to Firestore
      updateUserProfile(prev.uid, { hasCompletedIntake: true }).catch((err) =>
        console.warn('[AuthContext] completeIntake Firestore sync error:', err)
      );
      return { ...prev, hasCompletedIntake: true };
    });
    // Also mark intake as completed in registered clients list
    if (user) {
      setRegisteredClients((prev) =>
        prev.map((c) =>
          c.uid === user.uid || c.email === user.email
            ? { ...c, hasCompletedIntake: true }
            : c
        )
      );
    }
  };

  const currentUser: UserProfile | null = user
    ? {
        ...user,
        id: user.id || user.uid,
        coachId: user.coachId || user.assignedCoachId || (user.role === 'coach' || user.role === 'admin' ? (user.id || user.uid) : undefined)
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        currentUser,
        role: currentUser?.role || 'client',
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        loginAsDemo,
        switchRole,
        switchAdminUser,
        toggleRole,
        updateProfile,
        completeIntake,
        registeredClients
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

