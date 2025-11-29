import React from 'react';
import { Plus } from 'lucide-react';
import NoteCard from './NoteCard';
import { AnimatePresence } from 'framer-motion';

const Column = ({ column, notes, onAddNote, onUpdateNote, onDeleteNote, onVoteNote, currentUser, currentUserId, isAdmin, searchQuery }) => {
    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            note.content.toLowerCase().includes(query) ||
            note.author.toLowerCase().includes(query)
        );
    });

    return (
        <div className={`flex flex-col h-full rounded-2xl ${column.color} p-4 min-h-[500px]`}>
            <div className="flex items-center justify-between mb-4">
                <h2 className={`font-bold text-lg ${column.titleColor}`}>{column.title}</h2>
                <span className="bg-white/50 px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                    {filteredNotes.length}
                </span>
            </div>

            <button
                onClick={() => onAddNote(column.id)}
                className="w-full py-2.5 mb-4 bg-white/60 hover:bg-white text-gray-600 hover:text-blue-600 rounded-xl border border-transparent hover:border-blue-100 transition-all flex items-center justify-center gap-2 font-medium text-sm shadow-sm"
            >
                <Plus size={16} />
            </button>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {filteredNotes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onUpdate={onUpdateNote}
                            onDelete={onDeleteNote}
                            onVote={onVoteNote}
                            currentUser={currentUser}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                        />
                    ))}
                </AnimatePresence>

                {filteredNotes.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm italic">
                        {searchQuery ? 'No matches found' : 'No notes yet'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Column;
