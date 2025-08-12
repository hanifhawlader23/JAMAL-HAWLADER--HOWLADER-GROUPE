
import { initializeApp } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Securely load Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// A crucial check to ensure the app doesn't run without configuration.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Firebase configuration environment variables are not set. " +
    "Please create a `.env` or `.env.local` file in your project root and add your VITE_FIREBASE_* variables, " +
    "or set them in your deployment service's settings."
  );
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);

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