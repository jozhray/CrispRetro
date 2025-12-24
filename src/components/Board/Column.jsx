import React, { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, GripVertical, Sparkles, MoreVertical } from 'lucide-react';
import NoteCard from './NoteCard';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { COLUMN_COLORS } from '../../store/useBoard';

const DraggableNote = ({ note, isAdmin, onDragEnd, onDragStart, children }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={note}
            layoutId={note.id}
            dragListener={false}
            dragControls={dragControls}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            drag
            style={{
                transform: 'translate3d(0,0,0)',
                position: 'relative',
                zIndex: 1
            }}
            whileDrag={{
                scale: 1.05,
                zIndex: 100,
                cursor: 'grabbing'
            }}
            className="select-none"
        >
            {React.cloneElement(children, { dragControls })}
        </Reorder.Item>
    );
};


const Column = ({
    column,
    notes,
    onAddNote,
    onUpdateNote,
    onUpdateNoteColor,
    onDeleteNote,
    onVoteNote,
    onReactNote,
    onMoveNote,
    onReorderNotes,
    onAddComment,
    onUpdateComment,
    onDeleteComment,
    onUpdateColumn,
    onDeleteColumn,
    currentUser,
    currentUserId,
    isAdmin,
    searchQuery,
    hideTitleOnMobile = false,
    dragControls,
    onDragStart,
    onDragEnd
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isNoteDragging, setIsNoteDragging] = useState(false);
    const menuRef = useRef(null);

    // Handle click outside to close actions menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowActionsMenu(false);
            }
        };

        if (showActionsMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showActionsMenu]);

    const filteredNotes = notes
        .filter(note => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            const content = typeof note.content === 'string' ? note.content.toLowerCase() : '';
            const author = typeof note.author === 'string' ? note.author.toLowerCase() : '';
            return (
                content.includes(query) ||
                author.includes(query)
            );
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order

    const handleDragOver = (e) => {
        // Allow drag over for anyone - validation happens on drop
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
        e.preventDefault();
        setIsDragOver(false);

        const noteId = e.dataTransfer.getData('noteId');
        const noteAuthorId = e.dataTransfer.getData('authorId');

        if (noteId) {
            // Check if user is admin or owner of the note
            // We use the passed authorId for cross-column drops where 'note' lookup might fail
            const isOwner = noteAuthorId === currentUserId;

            if (isAdmin || isOwner) {
                onMoveNote(noteId, column.id);
            }
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

    const handleDragEnd = (event, info) => {
        if (!isAdmin) return;
        const dropPoint = info.point;
        // Find the element at the drop point
        const elements = document.elementsFromPoint(dropPoint.x, dropPoint.y);
        const targetColumn = elements.find(el => el.getAttribute('data-column-id'));

        if (targetColumn) {
            const targetColumnId = targetColumn.getAttribute('data-column-id');
            // If dropped on a different column, move the note
            if (targetColumnId !== column.id) {
                // Determine the note ID from the dragged element or state?
                // Reorder.Item passes 'value' which is the note object.
                // But onDragEnd doesn't give the value directly in all versions.
                // However, we are inside the map, so we have access to 'note.id'.
                // Wait, onDragEnd is defined OUTSIDE the map?
                // No, I should define it inside the map or pass a closure?
                // Defining it inside map is fine for capturing 'note.id'.
            }
        }
    };

    return (
        <div
            data-column-id={column.id}
            className={`flex flex-col h-full rounded-2xl relative ${isNoteDragging ? 'z-[60]' : 'z-10'} ${(() => {
                const color = (column.color || 'slate').toLowerCase();
                if (color.includes('green') || color.includes('emerald')) return 'bg-emerald-500/15';
                if (color.includes('red') || color.includes('rose')) return 'bg-rose-500/15';
                if (color.includes('yellow') || color.includes('amber')) return 'bg-amber-500/15';
                if (color.includes('purple') || color.includes('violet')) return 'bg-purple-500/15';
                if (color.includes('blue') || color.includes('sky')) return 'bg-sky-500/15';
                if (color.includes('orange')) return 'bg-orange-500/15';
                if (color.includes('indigo')) return 'bg-indigo-500/15';
                if (color.includes('pink')) return 'bg-pink-500/15';
                if (color.includes('teal')) return 'bg-teal-500/15';
                if (color.includes('lime')) return 'bg-lime-500/15';
                if (color.includes('fuchsia')) return 'bg-fuchsia-500/15';
                return 'bg-slate-400/20'; // Slate is more gray
            })()} backdrop-blur-xl border border-white/40 shadow-xl p-2 md:p-4 transition-all duration-200 ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2 scale-[1.02]' : ''
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
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            {isAdmin && (
                                <div
                                    className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-600 rounded touch-none"
                                    onPointerDown={(e) => dragControls?.start(e)}
                                >
                                    <GripVertical size={20} />
                                </div>
                            )}
                            <h2 className={`font-bold text-lg truncate ${column.titleColor} ${hideTitleOnMobile ? 'hidden md:block' : ''}`}>{column.title}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-white/50 px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                                {filteredNotes.length}
                            </span>
                            {isAdmin && (
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Column Actions"
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {showActionsMenu && (
                                        <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Color Picker Sub-item */}
                                            <div className="px-3 py-2 border-b border-gray-50" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2 block">Column Color</span>
                                                <div className="grid grid-cols-4 gap-1">
                                                    {COLUMN_COLORS.map((colorOption) => (
                                                        <button
                                                            key={colorOption.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onUpdateColumn(column.id, {
                                                                    color: colorOption.color,
                                                                    titleColor: colorOption.titleColor
                                                                });
                                                                setShowActionsMenu(false);
                                                            }}
                                                            className={`w-6 h-6 rounded-lg ${colorOption.previewColor} border border-whiteShadow hover:scale-110 transition-transform`}
                                                            title={colorOption.id}
                                                            style={{
                                                                boxShadow: column.color === colorOption.color ? '0 0 0 2px #fff, 0 0 0 4px #e2e8f0' : 'none'
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setIsEditing(true);
                                                    setShowActionsMenu(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                                            >
                                                <Pencil size={14} /> Edit Title
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setShowDeleteConfirm(true);
                                                    setShowActionsMenu(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                            >
                                                <Trash2 size={14} /> Delete Column
                                            </button>
                                        </div>
                                    )}
                                </div>
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
                    (!note.content || typeof note.content !== 'string' || note.content.trim() === '')
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

            {/* Content Area with Scroll */}
            <div className={`flex-1 ${isNoteDragging ? 'overflow-visible' : 'overflow-y-auto'} space-y-3 pr-1 custom-scrollbar`}>
                {/* Drop zone indicator when dragging */}
                {isDragOver && filteredNotes.length === 0 && (
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center text-blue-500 text-sm font-medium bg-blue-50/50">
                        Drop note here
                    </div>
                )}

                <Reorder.Group
                    axis="y"
                    values={filteredNotes}
                    onReorder={(newOrder) => onReorderNotes(column.id, newOrder.map(n => n.id))}
                    className="space-y-3"
                >
                    {filteredNotes.map(note => (
                        <DraggableNote
                            key={note.id}
                            note={note}
                            isAdmin={isAdmin}
                            onDragStart={() => {
                                document.body.classList.add('is-dragging');
                                setIsNoteDragging(true);
                                if (onDragStart) onDragStart();
                            }}
                            onDragEnd={(event, info) => {
                                document.body.classList.remove('is-dragging');
                                setIsNoteDragging(false);
                                if (onDragEnd) onDragEnd();

                                const isOwner = note.authorId === currentUserId;
                                if (!isAdmin && !isOwner) return;

                                const elements = document.elementsFromPoint(info.point.x, info.point.y);
                                const targetColumn = elements.find(el => el.hasAttribute('data-column-id'));
                                if (targetColumn) {
                                    const targetColumnId = targetColumn.getAttribute('data-column-id');
                                    // Only move if dropped on a different column
                                    if (targetColumnId && targetColumnId !== column.id) {
                                        onMoveNote(note.id, targetColumnId);
                                    }
                                }
                            }}
                        >
                            <NoteCard
                                note={note}
                                onUpdate={onUpdateNote}
                                onUpdateColor={onUpdateNoteColor}
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
                        </DraggableNote>

                    ))}
                </Reorder.Group>

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
