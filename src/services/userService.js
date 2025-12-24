import { database } from '../firebase';
import { ref, get, set, update, query, orderByChild, limitToLast } from 'firebase/database';
import bcrypt from 'bcryptjs';

// Sanitizes email to be used as a Firebase key (replaces . with _)
export const sanitizeEmail = (email) => {
    return email.replace(/\./g, '_').toLowerCase();
};

export const userService = {
    // Register new user
    registerUser: async (email, name, password) => {
        if (!email || !name || !password) throw new Error("All fields are required");

        const sanitizedEmail = sanitizeEmail(email);
        const userRef = ref(database, `users/${sanitizedEmail}`);

        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            throw new Error("User already exists. Please login.");
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: sanitizedEmail,
            email: email.toLowerCase(),
            name: name,
            password: hashedPassword,
            createdAt: Date.now(),
            lastLogin: Date.now()
        };

        await set(userRef, newUser);
        return newUser;
    },

    // Login user
    loginUser: async (email, password) => {
        if (!email || !password) throw new Error("Email and Password are required");

        const sanitizedEmail = sanitizeEmail(email);
        const userRef = ref(database, `users/${sanitizedEmail}`);

        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            throw new Error("User not found. Please register.");
        }

        const userData = snapshot.val();

        // Check if password is hashed (bcrypt hashes start with $2)
        const isHashed = userData.password && userData.password.startsWith('$2');
        let isValid = false;

        if (isHashed) {
            isValid = await bcrypt.compare(password, userData.password);
        } else {
            // Legacy: Plain text comparison
            isValid = userData.password === password;

            // If valid, auto-migrate to hash
            if (isValid) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await update(userRef, { password: hashedPassword });
            }
        }

        if (!isValid) {
            throw new Error("Invalid password");
        }

        // Update last login
        await update(userRef, { lastLogin: Date.now() });

        return userData;
    },

    // Reset Password
    resetPassword: async (email, newPassword) => {
        if (!email || !newPassword) throw new Error("Email and New Password are required");

        const sanitizedEmail = sanitizeEmail(email);
        const userRef = ref(database, `users/${sanitizedEmail}`);

        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            throw new Error("User not found.");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await update(userRef, { password: hashedPassword });
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
    // Logout user
    logoutUser: () => {
        localStorage.removeItem('crisp_user_name');
        localStorage.removeItem('crisp_user_email');
        localStorage.removeItem('crisp_user_id');
        // Optional: clear any board specific settings if needed
    }
};
