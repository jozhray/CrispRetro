import { useState, useEffect, useCallback } from 'react';
import { database } from '../firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { useToast } from '../components/Toast';

// Default columns for new boards
const DEFAULT_COLUMNS = {
    well: { id: 'well', title: 'What went Well', color: 'bg-green-50 border-green-200', titleColor: 'text-green-800', order: 0 },
    notWell: { id: 'notWell', title: "Didn't go Well", color: 'bg-red-50 border-red-200', titleColor: 'text-red-800', order: 1 },
    improve: { id: 'improve', title: 'What can be improved', color: 'bg-yellow-50 border-yellow-200', titleColor: 'text-yellow-800', order: 2 },
    kudos: { id: 'kudos', title: 'Kudos', color: 'bg-purple-50 border-purple-200', titleColor: 'text-purple-800', order: 3 },
};

// Available colors for columns
export const COLUMN_COLORS = [
    { id: 'green', color: 'bg-green-50 border-green-200', titleColor: 'text-green-800' },
    { id: 'red', color: 'bg-red-50 border-red-200', titleColor: 'text-red-800' },
    { id: 'yellow', color: 'bg-yellow-50 border-yellow-200', titleColor: 'text-yellow-800' },
    { id: 'purple', color: 'bg-purple-50 border-purple-200', titleColor: 'text-purple-800' },
    { id: 'blue', color: 'bg-blue-50 border-blue-200', titleColor: 'text-blue-800' },
    { id: 'orange', color: 'bg-orange-50 border-orange-200', titleColor: 'text-orange-800' },
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
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);

    // Toast for notifications
    const toast = useToast();

    const currentUser = localStorage.getItem('crisp_user_name');
    const currentUserId = localStorage.getItem('crisp_user_id');
    const isAdmin = currentUserId === adminId;

    // Check if Firebase is available
    useEffect(() => {
        if (database) {
            setIsFirebaseReady(true);
        }
    }, []);

    // Track online users - add current user when joining, remove when leaving
    useEffect(() => {
        if (!boardId || !database || !currentUserId || !currentUser) return;

        const userRef = ref(database, `boards/${boardId}/onlineUsers/${currentUserId}`);

        // Add user to online users
        set(userRef, {
            id: currentUserId,
            name: currentUser,
            joinedAt: Date.now()
        });

        // Remove user when they leave
        const cleanup = () => {
            remove(userRef);
        };

        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
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
                    // Convert online users object to array
                    const users = data.onlineUsers ? Object.values(data.onlineUsers) : [];
                    setOnlineUsers(users);
                } else {
                    setNotes({});
                    setColumns(DEFAULT_COLUMNS);
                    setBoardName('Sprint Retro');
                    setAdminId(null);
                    setOnlineUsers([]);
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
            columnId
        };

        setNotes(prev => {
            const updatedNotes = { ...prev, [newNote.id]: newNote };
            saveData({ notes: updatedNotes });
            return updatedNotes;
        });
    }, [notes, saveData]);

    const updateNote = useCallback((noteId, content) => {
        setNotes(prev => {
            const updatedNotes = { ...prev, [noteId]: { ...prev[noteId], content } };
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

    // Get sorted columns
    const sortedColumns = Object.values(columns).sort((a, b) => (a.order || 0) - (b.order || 0));

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
        reorderNotes
    };
};
