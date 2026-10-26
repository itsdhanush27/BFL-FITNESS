// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getAuth, 
  Auth, 
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithEmailAndPassword as fbSignInWithEmail,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup as fbSignInWithPopup,
  sendEmailVerification as fbSendEmailVerification,
  User as FirebaseUser
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
  writeBatch
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA_hRsuVO5vkMUgSOudycs-atRJGTLDh88",
  authDomain: "bfl-project-ef584.firebaseapp.com",
  projectId: "bfl-project-ef584",
  storageBucket: "bfl-project-ef584.firebasestorage.app",
  messagingSenderId: "493251166965",
  appId: "1:493251166965:web:83c218fbeb9344e1bffbbc",
  measurementId: "G-XZRCQRF9X2"
};

// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Initialize Firebase Storage
const storage: FirebaseStorage = getStorage(app);

// Initialize Analytics if supported in browser environment
let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported in this environment
  });

  (window as any).auth = auth;
  (window as any).db = db;
  (window as any).storage = storage;
}


export { 
  firebaseConfig,
  app, 
  auth, 
  analytics,
  db,
  storage,
  fbSignInWithEmail,
  fbCreateUser,
  fbSignOut,
  fbOnAuthStateChanged,
  GoogleAuthProvider,
  fbSignInWithPopup,
  fbSendEmailVerification,
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
  // Storage primitives
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};
export type { FirebaseUser, Firestore, Timestamp, FirebaseStorage };

