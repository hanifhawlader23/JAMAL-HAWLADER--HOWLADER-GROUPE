
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// User's actual Firebase configuration has been placed here.
const firebaseConfig = {
  apiKey: "AIzaSyAT_qLqwbSdMkhEs38fIZFFQNOz7eXeQkg",
  authDomain: "hawlader-d868a.firebaseapp.com",
  projectId: "hawlader-d868a",
  storageBucket: "hawlader-d868a.firebasestorage.app",
  messagingSenderId: "95207054125",
  appId: "1:95207054125:web:e2f965b739dabecdeb51a4",
  measurementId: "G-GD1ZSFB4P0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

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
