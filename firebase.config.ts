// ============================================
// firebase.config.ts - Firebase Configuration
// ============================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXGPaRvRdFAdbnJB9tfmiEQxXhO_7zKkU",
  authDomain: "scoremate-9389e.firebaseapp.com",
  projectId: "scoremate-9389e",
  storageBucket: "scoremate-9389e.firebasestorage.app",
  messagingSenderId: "589215481182",
  appId: "1:589215481182:web:d76fb236fe3aa5c0e5a3cf",
  measurementId: "G-HPW9W47BSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth - getAuth works for both web and native
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;
