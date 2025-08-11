
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
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Add a robust check to ensure all required Firebase config values are present.
// This provides a clear error message if the .env.local file is not set up correctly.
const requiredConfig = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
];

const isConfigValid = Object.entries(firebaseConfig).every(([key, value]) => {
    if(requiredConfig.includes(key)) {
        return !!value && !value.startsWith('YOUR_');
    }
    return true;
});


if (!isConfigValid) {
    throw new Error("Firebase configuration is not set correctly. Please ensure you have created a .env.local file with your project's credentials and have restarted the Next.js development server.");
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

// Make performance instrumentation optional based on measurementId
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  perf = getPerformance(app);
} else {
    perf = null;
}

export { app, db, auth, perf };
