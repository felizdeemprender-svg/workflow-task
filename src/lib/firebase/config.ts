import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAXmwaUGwqTqkeeKqFMMSAjcBIHTMv39GU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "workflow-project-studio.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "workflow-project-studio",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "workflow-project-studio.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1001279364789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1001279364789:web:8e241897ba278ba80a28fc"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Messaging only works in the browser
let messaging: any = null;
if (typeof window !== "undefined" && typeof navigator !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.error("Firebase messaging could not be initialized", e);
  }
}

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, functions, messaging, googleProvider };
