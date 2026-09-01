import { getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Silence non-critical internal SDK logs
setLogLevel('silent');

export const firebaseConfig = {
  apiKey: 'AIzaSyBYk8pxgUi5ZV10nUW91VTZ8lBGZYMJdkk',
  authDomain: 'slimdose-peptides.firebaseapp.com',
  projectId: 'slimdose-peptides',
  messagingSenderId: '1003572217504',
  appId: '1:1003572217504:web:8eebdd82710ab9fe7aabc5',
  measurementId: 'G-573TE9JRS5',
};

// Singleton Firebase App
export const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Singleton Firestore instance (HMR-safe)
let firestoreInstance;
try {
  firestoreInstance = getFirestore(app);
} catch {
  // not initialized yet
}

if (!firestoreInstance) {
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;

// Initialize and export Auth service
export const auth = getAuth(app);

export {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
};

export default app;
