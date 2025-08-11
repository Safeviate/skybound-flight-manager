
// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getPerformance } from "firebase/performance";

// Your web app's Firebase configuration (DEVELOPMENT)
const firebaseConfigDev = {
  apiKey: "YOUR_DEV_API_KEY",
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.appspot.com",
  messagingSenderId: "YOUR_DEV_SENDER_ID",
  appId: "YOUR_DEV_APP_ID",
  performanceInstrumentationEnabled: false,
};

// In a real-world scenario, you would have a separate config for production
const firebaseConfigProd = {
  apiKey: "YOUR_PROD_API_KEY",
  authDomain: "your-prod-app.firebaseapp.com",
  projectId: "your-prod-project-id",
  storageBucket: "your-prod-project.appspot.com",
  messagingSenderId: "YOUR_PROD_MESSAGING_SENDER_ID",
  appId: "YOUR_PROD_APP_ID",
  performanceInstrumentationEnabled: false,
};

const getFirebaseConfig = () => {
    // This environment variable would be set in your deployment environment (e.g., Vercel, Netlify, Firebase Hosting).
    const env = process.env.NEXT_PUBLIC_FIREBASE_ENV;

    if (env === 'production') {
        return firebaseConfigDev;
    }
    return firebaseConfigDev;
};

const firebaseConfig = getFirebaseConfig();

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
