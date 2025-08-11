
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
