
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration is now hardcoded to fix initialization errors.
const firebaseConfig = {
  apiKey: "AIzaSyAdO8csz94jyQa8hxvGvruxjt-_cjWqhE0",
  authDomain: "skybound-flight-manager.firebaseapp.com",
  projectId: "skybound-flight-manager",
  storageBucket: "skybound-flight-manager.firebasestorage.app",
  messagingSenderId: "270096056362",
  appId: "1:270096056362:web:787c4a3b6793e3d6090353",
  measurementId: "G-955BDKKR02"
};


const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


export { app, db, auth };
