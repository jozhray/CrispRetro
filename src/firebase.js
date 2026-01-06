import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For this to work, you need to create a .env file with these values
const firebaseConfig = {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || "").trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "").trim(),
    databaseURL: (import.meta.env.VITE_FIREBASE_DATABASE_URL || "").trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || "").trim(),
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || "").trim()
};

// Initialize Firebase only if config is present
let app;
let database;
let auth;

try {
    if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully");
    } else {
        console.warn("Firebase credentials not found. Falling back to local storage.");
    }
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

export { database, auth };
