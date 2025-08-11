
// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
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
  performanceInstrumentationEnabled: false,
};

// Basic validation to ensure environment variables are set
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.error("Firebase API key is not set. Please check your .env.local file.");
}


// Initialize Firebase app instance (ensuring it's only initialized once)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let db;
let auth;
let perf;

auth = getAuth(app);

if (typeof window !== 'undefined') {
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    cacheSizeBytes: 100 * 1024 * 1024, // 100mb cache
  });
} else {
  db = getFirestore(app);
}

if (typeof window !== 'undefined' && firebaseConfig.performanceInstrumentationEnabled) {
  perf = getPerformance(app);
} else {
    perf = null;
}

export { app, db, auth, perf };
