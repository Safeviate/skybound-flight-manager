
// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfigDev = {
  apiKey: "AIzaSyAdO8csz94jyQa8hxvGvruxjt-_cjWqhE0", 
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.appspot.com",
  messagingSenderId: "270096056362",
  appId: "1:270096056362:web:4bfc002f20d91174090353"
};

// In a real-world scenario, you would have a separate config for production
const firebaseConfigProd = {
  apiKey: "YOUR_PROD_API_KEY", 
  authDomain: "your-prod-app.firebaseapp.com",
  projectId: "your-prod-project-id",
  storageBucket: "your-prod-project.appspot.com",
  messagingSenderId: "YOUR_PROD_MESSAGING_SENDER_ID",
  appId: "YOUR_PROD_APP_ID"
};

const getFirebaseConfig = () => {
    // This environment variable would be set in your deployment environment (e.g., Vercel, Netlify, Firebase Hosting).
    const env = process.env.NEXT_PUBLIC_FIREBASE_ENV;
    
    if (env === 'production') {
        // For now, we'll return the dev config for both to ensure the app runs.
        // In a real setup, you'd replace this with your actual production config.
        // return firebaseConfigProd;
        return firebaseConfigDev; 
    }
    return firebaseConfigDev;
};


const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence
try {
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time.
          // This is a common scenario, and the app will still function online.
          console.warn('Firestore persistence failed: multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          // The current browser does not support all of the
          // features required to enable persistence
          console.error('Firestore persistence is not available in this browser.');
        }
      });
} catch (error) {
    console.error("Error enabling Firestore persistence:", error);
}

export { app, db, auth };
