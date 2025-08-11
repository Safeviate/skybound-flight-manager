
'use client';

// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getPerformance } from "firebase/performance";

// Your web app's Firebase configuration is now read from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Add a robust check to ensure all required Firebase config values are present.
const requiredConfig = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
];

const isConfigValid = Object.entries(firebaseConfig).every(([key, value]) => {
    if(requiredConfig.includes(key)) {
        return !!value && !value.startsWith('YOUR_');
    }
    return true;
});

let app: FirebaseApp;
if (isConfigValid) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} else {
    // This will be caught by the initialization logic in components.
    // This setup allows server-side code to import this file without crashing the build.
}

const getFirebaseApp = () => {
    if (!isConfigValid) {
         throw new Error("Firebase configuration is not set correctly. Please ensure you have created a .env.local file with your project's credentials and have restarted the Next.js development server.");
    }
    return app;
}


const auth = getAuth(getFirebaseApp());
const db = getFirestore(getFirebaseApp());

let perf: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  perf = getPerformance(getFirebaseApp());
}


export { getFirebaseApp, db, auth, perf };
