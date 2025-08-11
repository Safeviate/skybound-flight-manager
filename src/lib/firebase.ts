
'use client';

// IMPORTANT: This file is for client-side Firebase configuration and initialization.
// Do not include any server-side secrets or sensitive information here.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getPerformance } from "firebase/performance";

// Your web app's Firebase configuration is now read from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyAd08csz94jyQa8hxvGvruxjt-_cjWqhE0",
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.appspot.com",
  messagingSenderId: "270096056362",
  appId: "1:270096056362:web:787c4a3b6793e3d6090353",
  measurementId: "G-955BDKKR02",
};


// Add a robust check to ensure all required Firebase config values are present.
const isConfigValid = Object.values(firebaseConfig).every(value => !!value);

let app: FirebaseApp;

const getFirebaseApp = () => {
    if (!isConfigValid) {
         throw new Error("Firebase configuration is not set correctly. Please ensure you have created a .env.local file with your project's credentials and have restarted the Next.js development server.");
    }

    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
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
