import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For this to work, you need to create a .env file with these values
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is present
let app;
let database;

try {
    if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        console.log("Firebase initialized successfully");
    } else {
        console.warn("Firebase credentials not found. Falling back to local storage.");
    }
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

export { database };
