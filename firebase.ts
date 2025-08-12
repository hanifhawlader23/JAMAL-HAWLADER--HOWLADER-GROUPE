// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Firestore import

const firebaseConfig = {
  apiKey: "AIzaSyAT_qLqwbSdMkhEs38fIZFFQNOz7eXeQkg",
  authDomain: "hawlader-d868a.firebaseapp.com",
  projectId: "hawlader-d868a",
  storageBucket: "hawlader-d868a.firebasestorage.app",
  messagingSenderId: "95207054125",
  appId: "1:95207054125:web:e2f965b739dabecdeb51a4",
  measurementId: "G-GD1ZSFB4P0",
};

// 1) Initialize
export const app = initializeApp(firebaseConfig);

// 2) Firestore instance
export const db = getFirestore(app);

// 3) Analytics optional
export const analyticsPromise = isSupported()
  .then(ok => (ok ? getAnalytics(app) : null))
  .catch(() => null);
  