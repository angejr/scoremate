// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";

// firebase.config.js
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;