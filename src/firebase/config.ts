import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeErrorHandling } from '../utils/firestoreErrorHandler';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket'] as const;
  const missingKeys = requiredKeys.filter((key) => {
    const v = firebaseConfig[key];
    return !v || v.toString().includes('XXX');
  });

  if (missingKeys.length > 0) {
    console.error('❌ Firebase Configuration Error: Missing or invalid keys:', missingKeys);
    console.error('Please update your .env file with real Firebase credentials');
    throw new Error(`Firebase configuration incomplete. Missing: ${missingKeys.join(', ')}`);
  }

  // Extra guard for Storage bucket: must be '<project-id>.appspot.com'
  const bucket = String(firebaseConfig.storageBucket || '');
  const looksLikeUrl = bucket.startsWith('http://') || bucket.startsWith('https://') || bucket.includes('firebasestorage');
  const validSuffix = bucket.endsWith('.appspot.com');
  if (looksLikeUrl || !validSuffix) {
    console.error('❌ Invalid storageBucket. Expected format: <project-id>.appspot.com. Got:', bucket);
    console.error('Fix your .env, e.g.: VITE_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com');
    throw new Error('Invalid Firebase storageBucket configuration');
  }
};

// Validate configuration before initializing
validateFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Initialize Firestore with specific settings to avoid BloomFilter errors
export const db = initializeFirestore(app, {
  // Auto-detect and fallback to long-polling on networks that block HTTP/2/3 streams
  experimentalAutoDetectLongPolling: true,
  // If issues persist even with auto-detect, uncomment the line below to force long-polling
  // experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
});

export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize error handling
initializeErrorHandling();

export default app;
