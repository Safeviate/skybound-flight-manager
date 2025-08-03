// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getPerformance } from "firebase/performance"; // Removed 'isSupported' from here

// Your web app's Firebase configuration (DEVELOPMENT)
const firebaseConfigDev = {
  apiKey: "AIzaSyAdO8csz94jyQa8hxvGvruxjt-_cjWqhE0",
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.appspot.com",
  messagingSenderId: "270096056362",
  appId: "1:270096056362:web:fb34e234d2703809090353",
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
        // For now, we'll return the dev config for both to ensure the app runs.
        // In a real setup, you'd replace this with your actual production config.
        // return firebaseConfigProd;
        return firebaseConfigDev; // Currently returns dev config even for 'production' env
    }
    return firebaseConfigDev; // Always returns dev config for other environments
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase app instance (ensuring it's only initialized once)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Declare variables for Firebase services
let db;
let auth;
let perf;

// Initialize Authentication (can be done without window check as it's generally safe for SSR too)
auth = getAuth(app);

// Initialize Firestore (client-side specific initialization with options)
if (typeof window !== 'undefined') {
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    cacheSizeBytes: 100 * 1024 * 1024, // 100mb cache
  });
} else {
  // Fallback for server-side if 'initializeFirestore' with options isn't desired there
  // This ensures 'db' is always defined, even on the server, for consistency.
  db = getFirestore(app);
}

// Initialize Performance Monitoring (client-side only)
if (typeof window !== 'undefined') {
  // Direct initialization: getPerformance will handle checking for browser support internally
  perf = getPerformance(app);
} else {
    perf = null; // Ensure perf is null when running on the server
}


// Export all initialized services for use throughout your application
export { app, db, auth, perf };
