// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getPerformance, isSupported } from "firebase/performance";

// Your web app's Firebase configuration (DEVELOPMENT)
const firebaseConfigDev = {
  apiKey: "AIzaSyAdO8csz94jyQa8hxvGvruxjt-_cjWqhE0",
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.appspot.com",
  messagingSenderId: "270096056362",
  appId: "1:270096056362:web:fb34e234d2703809090353"
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
        return firebaseConfigDev; // Currently returns dev config even for 'production' env
    }
    return firebaseConfigDev; // Always returns dev config for other environments
};


const firebaseConfig = getFirebaseConfig();

// Initialize Firebase app instance (ensuring it's only initialized once)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);

// Conditionally initialize performance only on the client side
const perf = typeof window !== 'undefined' ? getPerformance(app) : null;


// Export all initialized services for use throughout your application
export { app, db, auth, perf };
