import { useState, useEffect, useCallback } from 'react';
import { database } from '../firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';

const INITIAL_COLUMNS = {
    well: { id: 'well', title: 'What went Well', color: 'bg-green-50 border-green-200', titleColor: 'text-green-800' },
    notWell: { id: 'notWell', title: "Didn't go Well", color: 'bg-red-50 border-red-200', titleColor: 'text-red-800' },
    improve: { id: 'improve', title: 'What can be improved', color: 'bg-yellow-50 border-yellow-200', titleColor: 'text-yellow-800' },
    kudos: { id: 'kudos', title: 'Kudos', color: 'bg-purple-50 border-purple-200', titleColor: 'text-purple-800' },
};

export const useBoard = (boardId) => {
    const [notes, setNotes] = useState({});
    const [boardName, setBoardName] = useState('Sprint Retro');
    const [adminId, setAdminId] = useState(null);
    const [timer, setTimer] = useState({ isRunning: false, timeLeft: 0 });
    const [music, setMusic] = useState({ isPlaying: false });
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    const currentUser = localStorage.getItem('crisp_user_name');
    const currentUserId = localStorage.getItem('crisp_user_id');
    const isAdmin = currentUserId === adminId;

    // Check if Firebase is available
    useEffect(() => {
        if (database) {
            setIsFirebaseReady(true);
        }
    }, []);

    // Load data (Firebase or LocalStorage)
    useEffect(() => {
        if (!boardId) return;

        if (database) {
            // Firebase Sync
            const boardRef = ref(database, `boards/${boardId}`);
            const unsubscribe = onValue(boardRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setNotes(data.notes || {});
                    setBoardName(data.name || 'Sprint Retro');
                    setAdminId(data.adminId || null);
                    setTimer(data.timer || { isRunning: false, timeLeft: 0 });
                    setMusic(data.music || { isPlaying: false });
                } else {
                    setNotes({});
                    setBoardName('Sprint Retro');
                    setAdminId(null);
                }
            });
            return () => unsubscribe();
        } else {
            // LocalStorage Fallback
            const saved = localStorage.getItem(`crisp_board_${boardId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setNotes(parsed.notes || {});
                setBoardName(parsed.name || 'Sprint Retro');
                setAdminId(parsed.adminId || null);
                setTimer(parsed.timer || { isRunning: false, timeLeft: 0 });
                setMusic(parsed.music || { isPlaying: false });
            }

            // Listen for storage events (cross-tab sync)
            const handleStorageChange = (e) => {
                if (e.key === `crisp_board_${boardId}`) {
                    const newVal = e.newValue ? JSON.parse(e.newValue) : null;
                    if (newVal) {
                        setNotes(newVal.notes || {});
                        setBoardName(newVal.name || 'Sprint Retro');
                        setAdminId(newVal.adminId || null);
                        setTimer(newVal.timer || { isRunning: false, timeLeft: 0 });
                        setMusic(newVal.music || { isPlaying: false });
                    }
                }
            };
            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, [boardId]);

    // Save data helper
    const saveData = useCallback((updates) => {
        if (!boardId) return;

        if (database) {
            update(ref(database, `boards/${boardId}`), updates);
        } else {
            const currentData = JSON.parse(localStorage.getItem(`crisp_board_${boardId}`) || '{}');
            const newData = { ...currentData, ...updates };
            localStorage.setItem(`crisp_board_${boardId}`, JSON.stringify(newData));
        }
    }, [boardId]);

    const updateBoardName = useCallback((name) => {
        setBoardName(name);
        saveData({ name });
    }, [saveData]);

    const addNote = useCallback((columnId, content, author, authorId) => {
        const newNote = {
            id: crypto.randomUUID(),
            content,
            author,
            authorId, // Store the user ID of the creator
            votes: 0,
            createdAt: Date.now(),
            columnId
        };

        setNotes(prev => {
            const updatedNotes = { ...prev, [newNote.id]: newNote };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const updateNote = useCallback((noteId, content) => {
        setNotes(prev => {
            const updatedNotes = { ...prev, [noteId]: { ...prev[noteId], content } };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const deleteNote = useCallback((noteId) => {
        setNotes(prev => {
            const updatedNotes = { ...prev };
            delete updatedNotes[noteId];
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const voteNote = useCallback((noteId) => {
        setNotes(prev => {
            const updatedNotes = { ...prev, [noteId]: { ...prev[noteId], votes: (prev[noteId].votes || 0) + 1 } };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const getNotesByColumn = useCallback((columnId) => {
        return Object.values(notes)
            .filter(note => note.columnId === columnId)
            .sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt);
    }, [notes]);

    // Timer Controls
    const updateTimer = useCallback((newTimerState) => {
        setTimer(newTimerState);
        saveData({ timer: newTimerState });
    }, [saveData]);

    // Music Controls
    const updateMusic = useCallback((musicState) => {
        // If passed a boolean (legacy), convert to object
        const newState = typeof musicState === 'boolean' ? { isPlaying: musicState } : musicState;

        setMusic(prev => ({ ...prev, ...newState }));
        saveData({ music: { ...music, ...newState } });
    }, [music, saveData]);

    return {
        columns: INITIAL_COLUMNS,
        notes,
        boardName,
        isFirebaseReady,
        isAdmin,
        timer,
        music,
        addNote,
        updateNote,
        deleteNote,
        voteNote,
        getNotesByColumn,
        updateBoardName,
        updateTimer,
        updateMusic
    };
};
