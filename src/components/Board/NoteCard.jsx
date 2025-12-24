import React, { useRef, useEffect, useState } from 'react';
import { ThumbsUp, Trash2, User, GripVertical, MessageSquare, Send, Edit2, X, Check, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NoteCard = ({ note, onUpdate, onUpdateColor, onDelete, onVote, onAddComment, onUpdateComment, onDeleteComment, currentUser, currentUserId, isAdmin, dragControls }) => {
    const cardRef = useRef(null);
    const textareaRef = useRef(null);
    const [showVoteAnimation, setShowVoteAnimation] = useState(false);
    const [lastVoteCount, setLastVoteCount] = useState(note.votes || 0);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [isVoting, setIsVoting] = useState(false); // Prevent double-clicks
    const [showColorPicker, setShowColorPicker] = useState(false);

    const NOTE_COLORS = [
        { id: 'white', value: '#ffffff', preview: '#f8fafc', label: 'White' },
        { id: 'yellow', value: '#fff9c4', preview: '#facc15', label: 'Yellow' },
        { id: 'blue', value: '#e3f2fd', preview: '#3b82f6', label: 'Blue' },
        { id: 'green', value: '#e8f5e9', preview: '#22c55e', label: 'Green' },
        { id: 'red', value: '#ffebee', preview: '#ef4444', label: 'Red' },
        { id: 'purple', value: '#f3e5f5', preview: '#a855f7', label: 'Purple' },
        { id: 'orange', value: '#fff3e0', preview: '#f97316', label: 'Orange' },
        { id: 'gray', value: '#f5f5f5', preview: '#94a3b8', label: 'Gray' },
        { id: 'cyan', value: '#e0f7fa', preview: '#06b6d4', label: 'Cyan' },
        { id: 'pink', value: '#fce4ec', preview: '#ec4899', label: 'Pink' },
    ];

    const getContrastColor = (hexValue) => {
        if (!hexValue || hexValue === 'transparent') return 'text-gray-700';
        // Convert hex to RGB
        const r = parseInt(hexValue.slice(1, 3), 16);
        const g = parseInt(hexValue.slice(3, 5), 16);
        const b = parseInt(hexValue.slice(5, 7), 16);
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6 ? 'text-gray-800' : 'text-white';
    };

    const contrastTextColor = getContrastColor(note.color || '#ffffff');
    const isDarkBackground = contrastTextColor === 'text-white';
    const canDelete = isAdmin || (note.authorId && note.authorId === currentUserId);

    // Check if current user has voted
    const hasVoted = note.votedBy?.includes(currentUserId);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [note.content]);

    // Handle click outside to close comments and color picker
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cardRef.current && !cardRef.current.contains(event.target)) {
                if (showComments) setShowComments(false);
                if (showColorPicker) setShowColorPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showComments, showColorPicker]);

    // Detect when votes increase (only show animation when votes go up)
    useEffect(() => {
        if (note.votes > lastVoteCount) {
            setShowVoteAnimation(true);
            setTimeout(() => setShowVoteAnimation(false), 1000);
        }
        setLastVoteCount(note.votes || 0);
    }, [note.votes]);

    // Check if note has content
    const hasContent = note.content && typeof note.content === 'string' && note.content.trim().length > 0;

    const handleVote = () => {
        if (!hasContent) return;

        // Only show animation if we're adding a vote, not removing
        if (!hasVoted) {
            setShowVoteAnimation(true);
            setTimeout(() => setShowVoteAnimation(false), 1000);
        }
        onVote(note.id);
    };

    const canMove = isAdmin || (note.authorId && note.authorId === currentUserId);

    const handleDragStart = (e) => {
        if (!canMove) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('noteId', note.id);
        e.dataTransfer.setData('authorId', note.authorId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    const submitComment = () => {
        // Optimistically clear input immediately to prevent UI lag
        const contentToSubmit = newComment.trim();
        if (contentToSubmit) {
            setNewComment(""); // Clear first
            onAddComment(note.id, contentToSubmit);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitComment();
        }
    };

    const startEditing = (comment) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
    };

    const cancelEditing = () => {
        setEditingCommentId(null);
        setEditContent("");
    };

    const saveEdit = (commentId) => {
        if (editContent.trim()) {
            onUpdateComment(note.id, commentId, editContent.trim());
            setEditingCommentId(null);
        }
    };

    const handleEditKeyDown = (e, commentId) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEdit(commentId);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    return (
        <motion.div
            ref={cardRef}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ backgroundColor: note.color || '#ffffff' }}
            className={`p-4 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-all relative overflow-hidden ${!canMove ? 'cursor-default' : ''}`}
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
                {/* Drag handle - Admin or Owner */}
                {canMove && (
                    <div
                        className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity pt-0.5 touch-none"
                        onPointerDown={(e) => dragControls?.start(e)}
                    >
                        <GripVertical size={16} />
                    </div>
                )}

                <div className="flex-1 mb-2">
                    <textarea
                        ref={textareaRef}
                        value={note.content}
                        onChange={(e) => onUpdate(note.id, e.target.value)}
                        className={`w-full resize-none outline-none bg-transparent placeholder-gray-400 ${contrastTextColor}`}
                        style={{ color: isDarkBackground ? '#ffffff' : undefined }}
                        placeholder="Type your thought..."
                        rows={1}
                        readOnly={!canDelete && typeof note.content === 'string' && note.content.length > 0}
                    />
                </div>
            </div>

            <div className={`flex items-center justify-between text-xs mt-3 pt-3 border-t ${isDarkBackground ? 'border-white/10 text-white/70' : 'border-gray-50 text-gray-500'}`}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isDarkBackground ? 'bg-black/20' : 'bg-gray-50'}`}>
                    <User size={12} />
                    <span className="font-medium truncate max-w-[100px]">{note.author}</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Comment Toggle */}
                    <button
                        onClick={() => hasContent && setShowComments(!showComments)}
                        disabled={!hasContent}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${!hasContent
                            ? (isDarkBackground ? 'bg-white/10 text-white/30 cursor-not-allowed opacity-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50')
                            : (note.comments && Object.keys(note.comments).length > 0)
                                ? (isDarkBackground ? 'bg-purple-900/40 text-purple-200' : 'bg-purple-50 text-purple-600')
                                : (isDarkBackground ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-400')
                            }`}
                        title={!hasContent ? "Add content to comment" : "Comments"}
                    >
                        <MessageSquare size={14} />
                        <span>{note.comments ? Object.keys(note.comments).length : 0}</span>
                    </button>

                    <motion.button
                        onClick={handleVote}
                        whileTap={hasContent ? { scale: 0.9 } : {}}
                        disabled={!hasContent}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${!hasContent
                            ? (isDarkBackground ? 'bg-white/10 text-white/30 cursor-not-allowed opacity-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50')
                            : hasVoted
                                ? (isDarkBackground ? 'bg-blue-600/40 text-blue-200 ring-1 ring-blue-500/50' : 'bg-blue-100 text-blue-600 ring-1 ring-blue-300')
                                : note.votes > 0
                                    ? (isDarkBackground ? 'bg-blue-900/40 text-blue-200' : 'bg-blue-50 text-blue-600')
                                    : (isDarkBackground ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500')
                            }`}
                        title={!hasContent ? "Add content to vote" : (hasVoted ? "Click to remove your vote" : "Click to vote")}
                    >
                        <motion.div
                            animate={showVoteAnimation ? { rotate: [0, -20, 20, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5 }}
                        >
                            <ThumbsUp size={14} className={hasVoted ? (isDarkBackground ? 'fill-blue-200' : 'fill-blue-600') : ''} />
                        </motion.div>
                        <span>{note.votes || 0}</span>
                    </motion.button>

                    {canDelete && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className={`p-1.5 rounded-full transition-all ${isDarkBackground ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'} opacity-0 group-hover:opacity-100`}
                                title="Change color"
                            >
                                <Palette size={14} />
                            </button>
                            <button
                                onClick={() => onDelete(note.id)}
                                className={`p-1.5 rounded-full transition-all ${isDarkBackground ? 'text-white/40 hover:text-red-300 hover:bg-red-900/40' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'} opacity-0 group-hover:opacity-100`}
                                title="Delete note"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Color Picker Overlay */}
            <AnimatePresence>
                {showColorPicker && canDelete && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-12 right-4 z-[70] bg-white shadow-2xl border border-gray-100 rounded-lg p-2.5 flex gap-1.5 flex-wrap max-w-[200px]"
                    >
                        {NOTE_COLORS.map(c => (
                            <button
                                key={c.id}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent re-triggering logic
                                    onUpdateColor(note.id, c.value);
                                    setShowColorPicker(false);
                                }}
                                className={`w-6 h-6 rounded-full border border-gray-100 shadow-sm transition-transform hover:scale-110 ${note.color === c.value ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                                style={{ backgroundColor: c.preview }}
                                title={c.label}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 pt-3 border-t border-gray-50 space-y-3">
                            {/* Comment List */}
                            {note.comments && Object.values(note.comments).sort((a, b) => a.createdAt - b.createdAt).map(comment => (
                                <div key={comment.id} className="bg-gray-50/50 p-2.5 rounded-lg text-xs group/comment relative border border-gray-100">
                                    <div className="flex justify-between items-start mb-1 h-5">
                                        <span className="font-semibold text-gray-700">{comment.author}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {comment.updatedAt && ' (edited)'}
                                            </span>

                                            {(isAdmin || comment.authorId === currentUserId) && !editingCommentId && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditing(comment)}
                                                        className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteComment(note.id, comment.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {editingCommentId === comment.id ? (
                                        <div className="flex gap-2 items-center mt-1">
                                            <input
                                                type="text"
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                onKeyDown={(e) => handleEditKeyDown(e, comment.id)}
                                                className="flex-1 bg-white border border-blue-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-100/50"
                                                autoFocus
                                            />
                                            <div className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden">
                                                <button onClick={() => saveEdit(comment.id)} className="p-1.5 text-green-600 hover:bg-green-50 transition-colors"><Check size={14} /></button>
                                                <div className="w-px h-full bg-gray-200"></div>
                                                <button onClick={cancelEditing} className="p-1.5 text-red-500 hover:bg-red-50 transition-colors"><X size={14} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                                    )}
                                </div>
                            ))}

                            {/* Add Comment Input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all"
                                />
                                <button
                                    onClick={submitComment}
                                    disabled={!newComment.trim()}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default NoteCard;
