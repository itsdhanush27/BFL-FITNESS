/**
 * BFL Fitness Mobile — Firebase Configuration
 * Connects to the SAME Firebase project as bfl-web.
 * Uses the JS SDK (compatible with Expo without native modules).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
  // @ts-ignore - getReactNativePersistence is provided by React Native bundle of firebase/auth
  getReactNativePersistence,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same Firebase config as bfl-web — SAME project, not a duplicate
const firebaseConfig = {
  apiKey: 'AIzaSyA_hRsuVO5vkMUgSOudycs-atRJGTLDh88',
  authDomain: 'bfl-project-ef584.firebaseapp.com',
  projectId: 'bfl-project-ef584',
  storageBucket: 'bfl-project-ef584.firebasestorage.app',
  messagingSenderId: '493251166965',
  appId: '1:493251166965:web:83c218fbeb9344e1bffbbc',
  measurementId: 'G-XZRCQRF9X2',
};

// Initialize Firebase App (singleton)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // If already initialized (hot reload), use existing instance
  auth = getAuth(app);
}

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Initialize Storage
const storage: FirebaseStorage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  // Auth functions
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  // Firestore primitives
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  writeBatch,
  limit,
  // Storage primitives
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
};

export type { FirebaseUser, Firestore, Timestamp, FirebaseStorage };
