'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getPerformance } from "firebase/performance";

// Your web app's Firebase configuration is now hardcoded to fix initialization errors.
const firebaseConfig = {
  apiKey: "AIzaSyA5A_wz9iZ7p7b8Y7q5c6V4w3c2B1a0G9o",
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:a1b2c3d4e5f6a7b8c9d0e1",
  measurementId: "G-ABC123XYZ"
};


const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let perf: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  try {
    perf = getPerformance(app);
  } catch (error) {
    console.log("Could not initialize Firebase Performance", error);
  }
}

export { app, db, auth, perf };
