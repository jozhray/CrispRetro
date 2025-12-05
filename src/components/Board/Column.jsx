import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import NoteCard from './NoteCard';
import { AnimatePresence } from 'framer-motion';
import { COLUMN_COLORS } from '../../store/useBoard';

const Column = ({
    column,
    notes,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onVoteNote,
    onReactNote,
    onMoveNote,
    onAddComment,
    onUpdateComment,
    onDeleteComment,
    onUpdateColumn,
    onDeleteColumn,
    currentUser,
    currentUserId,
    isAdmin,
    searchQuery,
    hideTitleOnMobile = false
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            note.content.toLowerCase().includes(query) ||
            note.author.toLowerCase().includes(query)
        );
    });

    const handleDragOver = (e) => {
        if (!isAdmin) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e) => {
        if (!isAdmin) return;
        e.preventDefault();
        setIsDragOver(false);

        const noteId = e.dataTransfer.getData('noteId');
        if (noteId) {
            onMoveNote(noteId, column.id);
        }
    };

    const handleSaveTitle = () => {
        if (editTitle.trim()) {
            onUpdateColumn(column.id, { title: editTitle.trim() });
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditTitle(column.title);
        setIsEditing(false);
    };

    const handleDeleteColumn = () => {
        onDeleteColumn(column.id);
        setShowDeleteConfirm(false);
    };

    return (
        <div
            className={`flex flex-col h-full rounded-2xl ${column.color} p-2 md:p-4 transition-all duration-200 ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2 scale-[1.02]' : ''
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex items-center justify-between mb-4">
                {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 px-2 py-1 text-lg font-bold rounded border border-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') handleCancelEdit();
                            }}
                        />
                        <button
                            onClick={handleSaveTitle}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                        >
                            <Check size={18} />
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className={`font-bold text-lg ${column.titleColor} ${hideTitleOnMobile ? 'hidden md:block' : ''}`}>{column.title}</h2>
                        <div className="flex items-center gap-2">
                            <span className="bg-white/50 px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                                {filteredNotes.length}
                            </span>
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Edit column title"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete column"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Column?</h3>
                        <p className="text-gray-600 mb-4">
                            This will permanently delete <strong>"{column.title}"</strong> and all <strong>{notes.length} note{notes.length !== 1 ? 's' : ''}</strong> in it.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteColumn}
                                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Note Button - disabled if current user has an empty note */}
            {(() => {
                const hasMyEmptyNote = notes.some(note =>
                    note.authorId === currentUserId &&
                    (!note.content || note.content.trim() === '')
                );
                return (
                    <button
                        onClick={() => !hasMyEmptyNote && onAddNote(column.id)}
                        disabled={hasMyEmptyNote}
                        className={`w-full py-2.5 mb-2 md:mb-4 rounded-xl border transition-all flex items-center justify-center gap-2 font-medium text-sm shadow-sm ${hasMyEmptyNote
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white/60 hover:bg-white text-gray-600 hover:text-blue-600 border-transparent hover:border-blue-100'
                            }`}
                        title={hasMyEmptyNote ? 'Please fill in your empty note first' : 'Add a new note'}
                    >
                        <Plus size={16} />
                    </button>
                );
            })()}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {/* Drop zone indicator when dragging */}
                {isDragOver && filteredNotes.length === 0 && (
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center text-blue-500 text-sm font-medium bg-blue-50/50">
                        Drop note here
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {filteredNotes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onUpdate={onUpdateNote}
                            onDelete={onDeleteNote}
                            onDelete={onDeleteNote}
                            onVote={onVoteNote}
                            onReact={onReactNote}
                            onAddComment={onAddComment}
                            onUpdateComment={onUpdateComment}
                            onDeleteComment={onDeleteComment}
                            currentUser={currentUser}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                        />
                    ))}
                </AnimatePresence>

                {filteredNotes.length === 0 && !isDragOver && (
                    <div className="text-center py-10 text-gray-400 text-sm italic">
                        {searchQuery ? 'No matches found' : 'No notes yet'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Column;
