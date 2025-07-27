
// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// Replace this with your actual Firebase config object
const firebaseConfig = {
  // Replace "PASTE_YOUR_FIREBASE_WEB_API_KEY_HERE" with the actual "apiKey" from your Firebase project's settings.
  apiKey: "AIzaSyAdO8csz94jyQa8hxvGvruxjt-_cjWqhE0", 
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.appspot.com",
  messagingSenderId: "270096056362",
  appId: "1:270096056362:web:4bfc002f20d91174090353"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
