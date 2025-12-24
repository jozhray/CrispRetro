import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { database } from '../firebase';
import { ref, onValue, set, update, remove, runTransaction, onDisconnect, get } from 'firebase/database';
import { useToast } from '../components/Toast';
import { sanitizeEmail } from '../services/userService';

// Default columns for new boards
const DEFAULT_COLUMNS = {
    well: { id: 'well', title: 'What went Well', color: 'bg-green-50 border-green-200', titleColor: 'text-green-900', order: 0 },
    notWell: { id: 'notWell', title: "Didn't go Well", color: 'bg-red-50 border-red-200', titleColor: 'text-red-900', order: 1 },
    improve: { id: 'improve', title: 'What can be improved', color: 'bg-yellow-50 border-yellow-200', titleColor: 'text-yellow-900', order: 2 },
    kudos: { id: 'kudos', title: 'Kudos', color: 'bg-purple-50 border-purple-200', titleColor: 'text-purple-900', order: 3 },
};

// Available colors for columns
export const COLUMN_COLORS = [
    { id: 'emerald', color: 'bg-green-50 border-green-200', titleColor: 'text-green-900', previewColor: 'bg-emerald-500' },
    { id: 'rose', color: 'bg-red-50 border-red-200', titleColor: 'text-red-900', previewColor: 'bg-rose-500' },
    { id: 'amber', color: 'bg-yellow-50 border-yellow-200', titleColor: 'text-yellow-900', previewColor: 'bg-amber-500' },
    { id: 'violet', color: 'bg-purple-50 border-purple-200', titleColor: 'text-purple-900', previewColor: 'bg-purple-500' },
    { id: 'sky', color: 'bg-blue-50 border-blue-200', titleColor: 'text-blue-900', previewColor: 'bg-sky-500' },
    { id: 'orange', color: 'bg-orange-50 border-orange-200', titleColor: 'text-orange-900', previewColor: 'bg-orange-500' },
    { id: 'indigo', color: 'bg-indigo-50 border-indigo-200', titleColor: 'text-indigo-900', previewColor: 'bg-indigo-500' },
    { id: 'pink', color: 'bg-pink-50 border-pink-200', titleColor: 'text-pink-900', previewColor: 'bg-pink-500' },
    { id: 'teal', color: 'bg-teal-50 border-teal-200', titleColor: 'text-teal-900', previewColor: 'bg-teal-500' },
    { id: 'lime', color: 'bg-lime-50 border-lime-200', titleColor: 'text-lime-900', previewColor: 'bg-lime-500' },
    { id: 'fuchsia', color: 'bg-fuchsia-50 border-fuchsia-200', titleColor: 'text-fuchsia-900', previewColor: 'bg-fuchsia-500' },
    { id: 'slate', color: 'bg-slate-50 border-slate-200', titleColor: 'text-slate-900', previewColor: 'bg-slate-500' }
];

export const useBoard = (boardId) => {
    const [notes, setNotes] = useState({});
    const [columns, setColumns] = useState(DEFAULT_COLUMNS);
    const [boardName, setBoardName] = useState('Sprint Retro');
    const [adminId, setAdminId] = useState(null);
    const [timer, setTimer] = useState({ isRunning: false, timeLeft: 180 });
    const [music, setMusic] = useState({ isPlaying: false });
    const [polls, setPolls] = useState({});
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [allMembers, setAllMembers] = useState({});
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    // Memoized sorted columns
    const sortedColumns = useMemo(() => {
        return Object.values(columns).sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [columns]);

    // Toast for notifications
    const toast = useToast();

    const currentUser = localStorage.getItem('crisp_user_name');
    const currentUserId = localStorage.getItem('crisp_user_id');
    const userEmail = localStorage.getItem('crisp_user_email');
    const [isAdmin, setIsAdmin] = useState(false);

    // Permission & Self-Healing Logic
    useEffect(() => {
        if (!boardId || !currentUserId) {
            setIsAdmin(false);
            return;
        }

        // 1. Direct match with adminId on board
        if (currentUserId === adminId) {
            setIsAdmin(true);
            return;
        }

        // 2. Check Ownership in User History (Self-Healing)
        if (userEmail && database) {
            const sanitizedEmail = sanitizeEmail(userEmail);
            const historyRef = ref(database, `users/${sanitizedEmail}/boards/${boardId}`);

            get(historyRef).then(snapshot => {
                if (snapshot.exists()) {
                    const historyData = snapshot.val();
                    if (historyData.role === 'owner') {
                        console.log("Self-healing: Ownership verified via history.");
                        setIsAdmin(true);

                        // If board's adminId is a UUID but we have a persistent ID, update the board
                        const isOriginalAdminUUID = adminId && adminId.length > 20 && adminId.includes('-');
                        if (isOriginalAdminUUID || !adminId) {
                            console.log("Self-healing: Updating board adminId to persistent ID.");
                            update(ref(database, `boards/${boardId}`), { adminId: currentUserId });
                        }
                    }
                }
            });
        }
    }, [boardId, currentUserId, adminId, userEmail]);

    // Check if Firebase is available
    useEffect(() => {
        if (database) {
            setIsFirebaseReady(true);
        }
    }, []);

    // Track online users - add current user when joining, remove when leaving
    useEffect(() => {
        if (!boardId || !database || !currentUserId || !currentUser) return;

        // Create a unique connection ID for this session/tab
        const connectionId = crypto.randomUUID();
        const userRef = ref(database, `boards/${boardId}/onlineUsers/${currentUserId}/${connectionId}`);
        const memberRef = ref(database, `boards/${boardId}/allMembers/${currentUserId}`);

        // Set user as online for this specific connection
        set(userRef, {
            id: currentUserId,
            name: currentUser,
            joinedAt: Date.now()
        }).then(() => {
            // Remove ONLY this connection on disconnect
            onDisconnect(userRef).remove();
        }).catch(err => console.error("Error setting online status:", err));

        // Track in "allMembers" (persistent history)
        runTransaction(memberRef, (currentData) => {
            // Logic remains same - updates lastSeen
            if (currentData) {
                return {
                    ...currentData,
                    name: currentUser,
                    lastSeen: Date.now()
                };
            } else {
                return {
                    id: currentUserId,
                    name: currentUser,
                    joinedAt: Date.now(), // First time join
                    lastSeen: Date.now()
                };
            }
        });

        // Cleanup on component unmount
        return () => {
            onDisconnect(userRef).cancel();
            remove(userRef);
        };
    }, [boardId, currentUserId, currentUser]);

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
                    setColumns(data.columns || DEFAULT_COLUMNS);
                    setBoardName(data.name || 'Sprint Retro');
                    setAdminId(data.adminId || null);
                    setTimer(data.timer || { isRunning: false, timeLeft: 180 });
                    setMusic(data.music || { isPlaying: false });
                    setPolls(data.polls || {});

                    // Handle multi-connection online users
                    // Structure: onlineUsers / {userId} / {connectionId} / {userData}
                    const users = [];
                    if (data.onlineUsers) {
                        Object.keys(data.onlineUsers).forEach(userId => {
                            const userOrConnections = data.onlineUsers[userId];
                            if (!userOrConnections) return;

                            // mixed mode support: check if it's a direct user object (legacy) or connection map (new)
                            if (userOrConnections.id && userOrConnections.name) {
                                // Legacy: It's the user object directly
                                users.push(userOrConnections);
                            } else {
                                // New: It's a map of connections
                                const connections = userOrConnections;
                                const connectionKeys = Object.keys(connections);
                                if (connectionKeys.length > 0) {
                                    // Use the latest connection (last one added usually, or just first)
                                    // We just need one valid user object for this ID
                                    const activeConnection = connections[connectionKeys[0]];
                                    if (activeConnection && activeConnection.id) {
                                        users.push(activeConnection);
                                    }
                                }
                            }
                        });
                    }
                    setOnlineUsers(users);
                    setAllMembers(data.allMembers || {});
                } else {
                    // Try LocalStorage Fallback if Firebase has no data yet
                    // This is helpful during the immediate transition after creation
                    const saved = localStorage.getItem(`crisp_board_${boardId}`);
                    if (saved) {
                        try {
                            const parsed = JSON.parse(saved);
                            setNotes(parsed.notes || {});
                            setColumns(parsed.columns || DEFAULT_COLUMNS);
                            setBoardName(parsed.name || 'Sprint Retro');
                            setAdminId(parsed.adminId || null);
                            setTimer(parsed.timer || { isRunning: false, timeLeft: 180 });
                            setMusic(parsed.music || { isPlaying: false });
                            setPolls(parsed.polls || {});
                            return; // Keep local data until Firebase has something
                        } catch (e) {
                            console.error("Failed to parse LocalStorage fallback:", e);
                        }
                    }

                    setNotes({});
                    setColumns(DEFAULT_COLUMNS);
                    setBoardName('Sprint Retro');
                    setAdminId(null);
                    setOnlineUsers([]);
                    setAllMembers({});
                }
            });
            return () => unsubscribe();
        } else {
            // LocalStorage Fallback
            const saved = localStorage.getItem(`crisp_board_${boardId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setNotes(parsed.notes || {});
                setColumns(parsed.columns || DEFAULT_COLUMNS);
                setBoardName(parsed.name || 'Sprint Retro');
                setAdminId(parsed.adminId || null);
                setTimer(parsed.timer || { isRunning: false, timeLeft: 180 });
                setMusic(parsed.music || { isPlaying: false });
                setPolls(parsed.polls || {});
            }

            // Listen for storage events (cross-tab sync)
            const handleStorageChange = (e) => {
                if (e.key === `crisp_board_${boardId}`) {
                    const newVal = e.newValue ? JSON.parse(e.newValue) : null;
                    if (newVal) {
                        setNotes(newVal.notes || {});
                        setColumns(newVal.columns || DEFAULT_COLUMNS);
                        setBoardName(newVal.name || 'Sprint Retro');
                        setAdminId(newVal.adminId || null);
                        setTimer(newVal.timer || { isRunning: false, timeLeft: 180 });
                        setMusic(newVal.music || { isPlaying: false });
                        setPolls(newVal.polls || {});
                    }
                }
            };
            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, [boardId]);

    // Save data helper
    const saveData = useCallback((updates) => {
        if (!boardId) return Promise.resolve();

        if (database) {
            return update(ref(database, `boards/${boardId}`), updates);
        } else {
            const currentData = JSON.parse(localStorage.getItem(`crisp_board_${boardId}`) || '{}');
            const newData = { ...currentData, ...updates };
            localStorage.setItem(`crisp_board_${boardId}`, JSON.stringify(newData));
            return Promise.resolve();
        }
    }, [boardId]);

    const updateBoardName = useCallback((name) => {
        setBoardName(name);
        saveData({ name });
    }, [saveData]);

    // Column CRUD operations
    const addColumn = useCallback((title, colorOption) => {
        const newColumnId = crypto.randomUUID();
        const maxOrder = Math.max(...Object.values(columns).map(c => c.order || 0), -1);

        const newColumn = {
            id: newColumnId,
            title,
            color: colorOption.color,
            titleColor: colorOption.titleColor,
            order: maxOrder + 1
        };

        setColumns(prev => {
            const updatedColumns = { ...prev, [newColumnId]: newColumn };
            saveData({ columns: updatedColumns });
            return updatedColumns;
        });

        return newColumnId;
    }, [columns, saveData]);

    const updateColumn = useCallback((columnId, updates) => {
        setColumns(prev => {
            if (!prev[columnId]) return prev;
            const updatedColumns = { ...prev, [columnId]: { ...prev[columnId], ...updates } };
            saveData({ columns: updatedColumns });
            return updatedColumns;
        });
    }, [saveData]);

    const deleteColumn = useCallback((columnId) => {
        // First, delete all notes in this column
        setNotes(prev => {
            const updatedNotes = { ...prev };
            Object.keys(updatedNotes).forEach(noteId => {
                if (updatedNotes[noteId].columnId === columnId) {
                    delete updatedNotes[noteId];
                }
            });
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });

        // Then delete the column
        setColumns(prev => {
            const updatedColumns = { ...prev };
            delete updatedColumns[columnId];
            saveData({ columns: updatedColumns });
            return updatedColumns;
        });
    }, [saveData]);

    const moveColumn = useCallback((newOrder) => {
        setColumns(prev => {
            const updatedColumns = { ...prev };
            newOrder.forEach((columnId, index) => {
                if (updatedColumns[columnId]) {
                    updatedColumns[columnId] = { ...updatedColumns[columnId], order: index };
                }
            });
            saveData({ columns: updatedColumns });
            return updatedColumns;
        });
    }, [saveData]);

    const addNote = useCallback((columnId, content, author, authorId) => {
        // Calculate next order
        const columnNotes = Object.values(notes).filter(n => n.columnId === columnId);
        const maxOrder = Math.max(...columnNotes.map(n => n.order || 0), -1);

        const newNote = {
            id: crypto.randomUUID(),
            content,
            author,
            authorId,
            votes: 0,
            order: maxOrder + 1,
            createdAt: Date.now(),
            columnId,
            color: '#ffffff' // Default white
        };

        setNotes(prev => {
            const updatedNotes = { ...prev, [newNote.id]: newNote };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [notes, saveData]);

    const updateNote = useCallback((noteId, content) => {
        if (typeof content !== 'string') {
            console.error("Attempted to update note with non-string content:", content);
            return;
        }
        setNotes(prev => {
            const updatedNotes = { ...prev, [noteId]: { ...prev[noteId], content } };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const updateNoteColor = useCallback((noteId, color) => {
        setNotes(prev => {
            if (!prev[noteId]) return prev;
            const updatedNotes = { ...prev, [noteId]: { ...prev[noteId], color } };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const reorderNotes = useCallback((columnId, newNoteOrder) => {
        setNotes(prev => {
            const updatedNotes = { ...prev };
            newNoteOrder.forEach((noteIdRaw, index) => {
                const noteId = String(noteIdRaw);
                if (updatedNotes[noteId] && updatedNotes[noteId].columnId === columnId) {
                    updatedNotes[noteId] = { ...updatedNotes[noteId], order: index };
                }
            });
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
        const userId = localStorage.getItem('crisp_user_id');

        setNotes(prev => {
            const note = prev[noteId];
            if (!note) return prev;

            const votedBy = note.votedBy || [];
            const hasVoted = votedBy.includes(userId);

            let updatedVotedBy;
            let newVotes;

            if (hasVoted) {
                updatedVotedBy = votedBy.filter(id => id !== userId);
                newVotes = Math.max(0, (note.votes || 1) - 1);
            } else {
                updatedVotedBy = [...votedBy, userId];
                newVotes = (note.votes || 0) + 1;
            }

            // Optimistic update
            const updatedNotes = {
                ...prev,
                [noteId]: {
                    ...note,
                    votes: newVotes,
                    votedBy: updatedVotedBy
                }
            };

            // Atomic Firebase Update
            if (database && boardId) {
                const noteRef = ref(database, `boards/${boardId}/notes/${noteId}`);
                update(noteRef, {
                    votes: newVotes,
                    votedBy: updatedVotedBy
                }).catch(err => {
                    console.error("Failed to update vote:", err);
                });
            } else {
                // Fallback for LocalStorage
                saveData({ notes: updatedNotes });
            }

            return updatedNotes;
        });
    }, [boardId, saveData]);

    const reactNote = useCallback((noteId, emoji) => {
        const userId = localStorage.getItem('crisp_user_id');
        if (!userId) {
            console.error('No user ID found');
            return;
        }

        setNotes(prev => {
            const note = prev[noteId];
            if (!note) {
                console.error('Note not found:', noteId);
                return prev;
            }

            // Deep clone reactions
            const reactions = JSON.parse(JSON.stringify(note.reactions || {}));

            // Convert any Firebase objects to arrays
            Object.keys(reactions).forEach(key => {
                if (!Array.isArray(reactions[key])) {
                    reactions[key] = Object.values(reactions[key] || {});
                }
            });

            const emojiReactions = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
            const hasReactedWithThisEmoji = emojiReactions.includes(userId);

            if (hasReactedWithThisEmoji) {
                // Remove reaction if clicking the same emoji
                reactions[emoji] = emojiReactions.filter(id => id !== userId);
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji];
                }
            } else {
                // First, remove user's reaction from ALL other emojis
                Object.keys(reactions).forEach(key => {
                    if (key !== emoji && Array.isArray(reactions[key])) {
                        reactions[key] = reactions[key].filter(id => id !== userId);
                        if (reactions[key].length === 0) {
                            delete reactions[key];
                        }
                    }
                });

                // Then add reaction to the new emoji
                reactions[emoji] = [...emojiReactions, userId];
            }

            const updatedNote = { ...note, reactions };
            const updatedNotes = { ...prev, [noteId]: updatedNote };

            // Save to Firebase/localStorage
            saveData({ notes: updatedNotes });

            return updatedNotes;
        });
    }, [saveData]);

    const addComment = useCallback((noteId, content) => {
        const userId = localStorage.getItem('crisp_user_id');
        const userName = localStorage.getItem('crisp_user_name');

        if (!content.trim()) return;

        const commentId = crypto.randomUUID();
        const newComment = {
            id: commentId,
            content,
            author: userName,
            authorId: userId,
            createdAt: Date.now()
        };

        setNotes(prev => {
            const note = prev[noteId];
            if (!note) return prev;

            const updatedComments = { ...(note.comments || {}), [commentId]: newComment };
            const updatedNote = { ...note, comments: updatedComments };
            const updatedNotes = { ...prev, [noteId]: updatedNote };

            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const updateComment = useCallback((noteId, commentId, newContent) => {
        setNotes(prev => {
            const note = prev[noteId];
            if (!note || !note.comments || !note.comments[commentId]) return prev;

            const updatedComment = {
                ...note.comments[commentId],
                content: newContent,
                updatedAt: Date.now()
            };

            const updatedComments = { ...note.comments, [commentId]: updatedComment };
            const updatedNote = { ...note, comments: updatedComments };
            const updatedNotes = { ...prev, [noteId]: updatedNote };

            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const deleteComment = useCallback((noteId, commentId) => {
        setNotes(prev => {
            const note = prev[noteId];
            if (!note || !note.comments) return prev;

            const updatedComments = { ...note.comments };
            delete updatedComments[commentId];

            const updatedNote = { ...note, comments: updatedComments };
            const updatedNotes = { ...prev, [noteId]: updatedNote };

            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const moveNote = useCallback((noteId, newColumnId) => {
        setNotes(prev => {
            if (!prev[noteId]) return prev;
            const updatedNotes = { ...prev, [noteId]: { ...prev[noteId], columnId: newColumnId } };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [saveData]);

    const getNotesByColumn = useCallback((columnId) => {
        return Object.values(notes)
            .filter(note => note.columnId === columnId)
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }, [notes]);

    // Timer Controls
    const updateTimer = useCallback((newTimerState) => {
        setTimer(newTimerState);
        saveData({ timer: newTimerState });
    }, [saveData]);

    // Music Controls
    const updateMusic = useCallback((musicState) => {
        const newState = typeof musicState === 'boolean' ? { isPlaying: musicState } : musicState;
        setMusic(prev => ({ ...prev, ...newState }));
        saveData({ music: { ...music, ...newState } });
    }, [music, saveData]);

    // Poll Controls
    const createPoll = useCallback((question, options) => {
        const pollId = crypto.randomUUID();
        const newPoll = {
            id: pollId,
            question,
            options: options.map((opt, idx) => ({ id: idx, text: opt, votes: [] })),
            createdAt: Date.now(),
            createdBy: currentUserId,
            isActive: true
        };
        setPolls(prev => {
            const updatedPolls = { ...prev, [pollId]: newPoll };
            saveData({ polls: updatedPolls });
            return updatedPolls;
        });
        return pollId;
    }, [currentUserId, saveData]);

    const votePoll = useCallback((pollId, optionId) => {
        setPolls(prev => {
            const poll = prev[pollId];
            if (!poll || !poll.isActive) return prev;

            // Get options as array (Firebase might convert to object)
            const pollOptions = Array.isArray(poll.options) ? poll.options : Object.values(poll.options || {});

            // Remove previous vote from this user if any
            const updatedOptions = pollOptions.map(opt => ({
                ...opt,
                votes: (opt.votes || []).filter(v => v !== currentUserId)
            }));

            // Add new vote
            if (updatedOptions[optionId]) {
                updatedOptions[optionId].votes = [...(updatedOptions[optionId].votes || []), currentUserId];
            }

            const updatedPoll = { ...poll, options: updatedOptions };
            const updatedPolls = { ...prev, [pollId]: updatedPoll };
            saveData({ polls: updatedPolls });
            return updatedPolls;
        });
    }, [currentUserId, saveData]);

    const closePoll = useCallback((pollId) => {
        setPolls(prev => {
            const poll = prev[pollId];
            if (!poll) return prev;
            const updatedPoll = { ...poll, isActive: false, closedAt: Date.now() };
            const updatedPolls = { ...prev, [pollId]: updatedPoll };
            saveData({ polls: updatedPolls });
            return updatedPolls;
        });
    }, [saveData]);

    const deletePoll = useCallback((pollId) => {
        setPolls(prev => {
            const { [pollId]: _, ...rest } = prev;
            saveData({ polls: rest });
            return rest;
        });
    }, [saveData]);

    // Clear all notes (Admin only)
    const clearAllNotes = useCallback(() => {
        // Optimistic local update
        setNotes({});

        if (database && boardId) {
            console.log("Removing notes from Firebase...");
            const notesRef = ref(database, `boards/${boardId}/notes`);
            remove(notesRef)
                .then(() => {
                    console.log("Successfully cleared notes from Firebase.");
                    toast.success("Board cleared successfully");
                })
                .catch((error) => {
                    console.error("Failed to clear notes:", error);
                    toast.error("Failed to clear notes. Please try again.");
                    // Reload to restore state if write failed
                    window.location.reload();
                });
        } else {
            // Fallback for LocalStorage
            console.log("Clearing notes from LocalStorage...");
            saveData({ notes: {} });
            toast.success("Board cleared (Local)");
        }
    }, [boardId, saveData, toast]);

    // Get active poll (most recent active)
    const activePoll = Object.values(polls).find(p => p.isActive) || null;

    return {
        columns,
        sortedColumns,
        notes,
        boardName,
        isFirebaseReady,
        isAdmin,
        timer,
        music,
        polls,
        activePoll,
        onlineUsers,
        addColumn,
        updateColumn,
        deleteColumn,
        addNote,
        updateNote,
        updateNoteColor,
        deleteNote,
        voteNote,
        reactNote,
        addComment,
        updateComment,
        deleteComment,
        moveNote,
        getNotesByColumn,
        updateBoardName,
        updateTimer,
        updateMusic,
        createPoll,
        votePoll,
        closePoll,
        deletePoll,
        clearAllNotes,
        moveColumn,
        reorderNotes,
        allMembers
    };
};
