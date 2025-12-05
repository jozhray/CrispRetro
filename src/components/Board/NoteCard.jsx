import React, { useRef, useEffect, useState } from 'react';
import { ThumbsUp, Trash2, User, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NoteCard = ({ note, onUpdate, onDelete, onVote, currentUser, currentUserId, isAdmin }) => {
    const textareaRef = useRef(null);
    const [showVoteAnimation, setShowVoteAnimation] = useState(false);
    const [lastVoteCount, setLastVoteCount] = useState(note.votes || 0);
    const canDelete = isAdmin || (note.authorId && note.authorId === currentUserId);

    // Check if current user has voted
    const hasVoted = note.votedBy?.includes(currentUserId);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [note.content]);

    // Detect when votes increase (only show animation when votes go up)
    useEffect(() => {
        if (note.votes > lastVoteCount) {
            setShowVoteAnimation(true);
            setTimeout(() => setShowVoteAnimation(false), 1000);
        }
        setLastVoteCount(note.votes || 0);
    }, [note.votes]);

    // Check if note has content
    const hasContent = note.content && note.content.trim().length > 0;

    const handleVote = () => {
        if (!hasContent) return;
        // Only show animation if we're adding a vote, not removing
        if (!hasVoted) {
            setShowVoteAnimation(true);
            setTimeout(() => setShowVoteAnimation(false), 1000);
        }
        onVote(note.id);
    };

    const handleDragStart = (e) => {
        if (!isAdmin) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('noteId', note.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            draggable={isAdmin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-shadow relative overflow-hidden ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* Floating thumbs up animation */}
            <AnimatePresence>
                {showVoteAnimation && (
                    <>
                        <motion.div
                            initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                            animate={{ opacity: 0, y: -60, x: -10, scale: 1.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="absolute bottom-8 right-8 text-2xl pointer-events-none z-10"
                        >
                            👍
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                            animate={{ opacity: 0, y: -50, x: 10, scale: 1.3 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                            className="absolute bottom-10 right-12 text-xl pointer-events-none z-10"
                        >
                            👍
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 1, y: 0, scale: 1 }}
                            animate={{ opacity: 0, y: -70, scale: 1.8 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.05 }}
                            className="absolute bottom-6 right-6 text-lg pointer-events-none z-10"
                        >
                            👍
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex gap-2">
                {/* Drag handle - Admin only */}
                {isAdmin && (
                    <div className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                        <GripVertical size={16} />
                    </div>
                )}

                <div className="flex-1 mb-2">
                    <textarea
                        ref={textareaRef}
                        value={note.content}
                        onChange={(e) => onUpdate(note.id, e.target.value)}
                        className="w-full resize-none outline-none text-gray-700 bg-transparent placeholder-gray-400"
                        placeholder="Type your thought..."
                        rows={1}
                        readOnly={!canDelete && note.content.length > 0}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full">
                    <User size={12} />
                    <span className="font-medium truncate max-w-[100px]">{note.author}</span>
                </div>

                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={handleVote}
                        whileTap={hasContent ? { scale: 0.9 } : {}}
                        disabled={!hasContent}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${!hasContent
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                            : hasVoted
                                ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-300'
                                : note.votes > 0
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'hover:bg-gray-100'
                            }`}
                        title={!hasContent ? "Add content to vote" : (hasVoted ? "Click to remove your vote" : "Click to vote")}
                    >
                        <motion.div
                            animate={showVoteAnimation ? { rotate: [0, -20, 20, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5 }}
                        >
                            <ThumbsUp size={14} className={hasVoted ? 'fill-blue-600' : ''} />
                        </motion.div>
                        <span>{note.votes || 0}</span>
                    </motion.button>

                    {canDelete && (
                        <button
                            onClick={() => onDelete(note.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete note"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default NoteCard;
