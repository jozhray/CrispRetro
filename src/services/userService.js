import { database, auth } from '../firebase';
import { ref, get, set, update, remove } from 'firebase/database';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';

// Sanitizes email to be used as a Firebase key (replaces . with _)
export const sanitizeEmail = (email) => {
    return email.replace(/\./g, '_').toLowerCase();
};

export const userService = {
    // Register new user with Firebase Auth
    registerUser: async (email, name, password) => {
        if (!email || !name || !password) throw new Error("All fields are required");

        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // 2. Save profile in Realtime Database for board history/permissions
        const sanitizedEmail = sanitizeEmail(email);
        const userRef = ref(database, `users/${sanitizedEmail}`);

        const newUser = {
            id: sanitizedEmail, // We use sanitized email as ID for storage path consistency
            uid: firebaseUser.uid, // Store the Firebase Auth UID
            email: email.toLowerCase(),
            name: name,
            createdAt: Date.now(),
            lastLogin: Date.now()
        };

        await set(userRef, newUser);
        return newUser;
    },

    // Login user with Firebase Auth
    loginUser: async (email, password) => {
        if (!email || !password) throw new Error("Email and Password are required");

        // 1. Authenticate with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // 2. Fetch profile from Realtime Database
        const sanitizedEmail = sanitizeEmail(email);
        const userRef = ref(database, `users/${sanitizedEmail}`);

        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            // Edge case: Auth exists but profile doesn't (maybe manually deleted in DB)
            // Create a basic profile to avoid crash
            const basicProfile = {
                id: sanitizedEmail,
                uid: firebaseUser.uid,
                email: email.toLowerCase(),
                name: email.split('@')[0], // Fallback name
                lastLogin: Date.now()
            };
            await set(userRef, basicProfile);
            return basicProfile;
        }

        const userData = snapshot.val();

        // Update last login in DB
        await update(userRef, { lastLogin: Date.now(), uid: firebaseUser.uid });

        return userData;
    },

    // Send Password Reset Email via Firebase Auth
    sendResetEmail: async (email) => {
        if (!email) throw new Error("Email is required");

        // Check if user exists in database first (to help legacy users)
        const sanitizedEmail = sanitizeEmail(email);
        const userRef = ref(database, `users/${sanitizedEmail}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            throw new Error("No account found with this email address. Please register.");
        }

        // Send reset email via Firebase Auth
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Firebase Auth Reset Error:", error);
            if (error.code === 'auth/user-not-found') {
                throw new Error("This account exists in our records but hasn't been upgraded to our new secure system yet. Please click 'Sign Up' to upgrade your account.");
            }
            throw error;
        }
        return true;
    },

    // Save a created board to user's history
    saveBoardToHistory: async (email, boardData) => {
        if (!email || !boardData) return;

        const sanitizedEmail = sanitizeEmail(email);
        const historyRef = ref(database, `users/${sanitizedEmail}/boards/${boardData.id}`);

        try {
            await set(historyRef, {
                id: boardData.id,
                name: boardData.name,
                createdAt: Date.now(),
                role: 'owner'
            });
        } catch (error) {
            console.error("Failed to save board history:", error);
        }
    },

    // Fetch user's board history (last 30 days)
    getUserBoardHistory: async (email) => {
        if (!email) return [];

        const sanitizedEmail = sanitizeEmail(email);
        const boardsRef = ref(database, `users/${sanitizedEmail}/boards`);

        try {
            // Fetch everything and filter locally for simplicity with Dates
            // (Firebase query by date requires indexed child)
            const snapshot = await get(boardsRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                const now = Date.now();
                const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

                return Object.values(data)
                    .filter(board => (now - board.createdAt) < thirtyDaysMs)
                    .sort((a, b) => b.createdAt - a.createdAt); // Newest first
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch board history:", error);
            return [];
        }
    },

    // Save a custom board template
    saveTemplate: async (email, templateData) => {
        if (!email || !templateData) return;

        const sanitizedEmail = sanitizeEmail(email);
        const templateId = crypto.randomUUID();
        const templateRef = ref(database, `users/${sanitizedEmail}/templates/${templateId}`);

        try {
            await set(templateRef, {
                ...templateData,
                id: templateId,
                createdAt: Date.now()
            });
            return templateId;
        } catch (error) {
            console.error("Failed to save template:", error);
            throw error;
        }
    },

    // Fetch user's templates
    getUserTemplates: async (email) => {
        if (!email) return [];

        const sanitizedEmail = sanitizeEmail(email);
        const templatesRef = ref(database, `users/${sanitizedEmail}/templates`);

        try {
            const snapshot = await get(templatesRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                return Object.values(data).sort((a, b) => b.createdAt - a.createdAt);
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch templates:", error);
            return [];
        }
    },
    // Logout user
    logoutUser: () => {
        localStorage.removeItem('crisp_user_name');
        localStorage.removeItem('crisp_user_email');
        localStorage.removeItem('crisp_user_id');
        // Optional: clear any board specific settings if needed
    },

    // Delete a user's template
    deleteTemplate: async (email, templateId) => {
        if (!email || !templateId) return;
        const sanitizedEmail = sanitizeEmail(email);
        const templateRef = ref(database, `users/${sanitizedEmail}/templates/${templateId}`);
        try {
            await remove(templateRef);
        } catch (error) {
            console.error("Failed to delete template:", error);
            throw error;
        }
    },

    // Delete a board from user's history
    deleteBoardFromHistory: async (email, boardId) => {
        if (!email || !boardId) return;
        const sanitizedEmail = sanitizeEmail(email);
        const historyRef = ref(database, `users/${sanitizedEmail}/boards/${boardId}`);
        try {
            await remove(historyRef);
        } catch (error) {
            console.error("Failed to delete board history:", error);
            throw error;
        }
    }
};
