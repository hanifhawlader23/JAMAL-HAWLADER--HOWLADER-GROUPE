

import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// The execution environment provides secrets via a `process.env` object.
// These variables are expected to be set without the `VITE_` prefix.
const firebaseConfig = {
  apiKey: (process.env as any).FIREBASE_API_KEY,
  authDomain: (process.env as any).FIREBASE_AUTH_DOMAIN,
  projectId: (process.env as any).FIREBASE_PROJECT_ID,
  storageBucket: (process.env as any).FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (process.env as any).FIREBASE_MESSAGING_SENDER_ID,
  appId: (process.env as any).FIREBASE_APP_ID,
  measurementId: (process.env as any).FIREBASE_MEASUREMENT_ID
};

// A crucial check to ensure the app doesn't run without configuration.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Firebase configuration environment variables are not set. " +
    "Please set the FIREBASE_* variables (e.g., FIREBASE_API_KEY) in your deployment service's settings."
  );
}


// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];


// Initialize Cloud Firestore with WebSocket fallback.
// This helps prevent connection errors in environments that may block WebSockets.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});


// Enable offline persistence to handle network issues gracefully
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Firestore offline persistence enabled.");
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      console.warn("Firestore offline persistence could not be enabled: failed-precondition. This usually means multiple tabs are open.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.error("Firestore offline persistence is not supported in this browser.");
    } else {
        console.error("Failed to enable Firestore offline persistence:", err);
    }
  });