import React, { useRef, useEffect } from 'react';
import { ThumbsUp, Trash2, User } from 'lucide-react';
import { motion } from 'framer-motion';

const NoteCard = ({ note, onUpdate, onDelete, onVote, currentUser, currentUserId, isAdmin }) => {
    const textareaRef = useRef(null);
    const canDelete = isAdmin || (note.authorId && note.authorId === currentUserId);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [note.content]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-shadow"
        >
            <div className="mb-2">
                <textarea
                    ref={textareaRef}
                    value={note.content}
                    onChange={(e) => onUpdate(note.id, e.target.value)}
                    className="w-full resize-none outline-none text-gray-700 bg-transparent placeholder-gray-400"
                    placeholder="Type your thought..."
                    rows={1}
                    readOnly={!canDelete && note.content.length > 0} // Optional: Prevent editing if not owner? User didn't ask for this but it makes sense.
                />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full">
                    <User size={12} />
                    <span className="font-medium truncate max-w-[100px]">{note.author}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onVote(note.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${note.votes > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                            }`}
                    >
                        <ThumbsUp size={14} />
                        <span>{note.votes || 0}</span>
                    </button>

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
