// firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";

// Helper function to safely get environment variables.
// It checks for Vite's `import.meta.env` first, then falls back to `process.env`.
const getEnvVar = (viteName: string): string | undefined => {
    // Vite's standard way for client-side vars
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env[viteName];
    }
    // Fallback for Node.js/serverless environments
    if (typeof process !== 'undefined' && process.env) {
        return process.env[viteName];
    }
    return undefined;
};


const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID'),
};

// Check for required config variables to provide a clear error.
// The ConnectionErrorScreen in DataContext is good, but this provides an earlier, more direct error.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration environment variables are not set. Please create a `.env` or `.env.local` file in your project root and add your VITE_FIREBASE_* variables, or set them in your deployment service's settings. The application could not find them in either import.meta.env or process.env.");
}

// Prevent re-initialization on hot reloads which is common in dev environments like Vite
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
});