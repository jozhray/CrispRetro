import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, Plus, X, Check, Trash2, Users, Lock, Minus, Maximize2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Poll = ({
    polls = {},
    activePoll,
    isAdmin,
    onCreatePoll,
    onVotePoll,
    onClosePoll,
    onDeletePoll,
    currentUserId
}) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isMinimized, setIsMinimized] = useState(false);

    const handleAddOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleCreatePoll = () => {
        if (!question.trim()) return;
        const validOptions = options.filter(o => o.trim());
        if (validOptions.length < 2) return;

        onCreatePoll(question.trim(), validOptions);
        setQuestion('');
        setOptions(['', '']);
        setShowCreateModal(false);
    };

    // Get poll options safely (Firebase might convert arrays to objects)
    const getPollOptions = (poll) => {
        if (!poll?.options) return [];
        return Array.isArray(poll.options) ? poll.options : Object.values(poll.options);
    };

    const getUserVote = (poll) => {
        const pollOptions = getPollOptions(poll);
        for (let opt of pollOptions) {
            if (opt?.votes?.includes?.(currentUserId)) {
                return opt.id;
            }
        }
        return null;
    };

    const getTotalVotes = (poll) => {
        const pollOptions = getPollOptions(poll);
        return pollOptions.reduce((sum, opt) => sum + (opt?.votes?.length || 0), 0);
    };

    // Get all polls sorted by creation time (newest first)
    const safePolls = polls || {};
    const sortedPolls = Object.values(safePolls).sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));

    return (
        <div className="relative">
            {/* Create Poll Button - Admin Only */}
            {isAdmin && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 h-[46px] px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
                >
                    <BarChart3 size={18} />
                    <span className="hidden sm:inline">Create Poll</span>
                </button>
            )}

            {/* Active Poll Display - Draggable */}
            <AnimatePresence>
                {activePoll && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        dragElastic={0}
                        initial={{ opacity: 0, y: -10, x: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{ position: 'fixed', top: 80, right: 16 }}
                        className={`bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 ${isMinimized ? 'w-auto' : 'w-80'}`}
                    >
                        {/* Poll Header - Drag Handle */}
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 text-white cursor-grab active:cursor-grabbing"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <GripVertical size={16} className="opacity-60" />
                                    <BarChart3 size={18} />
                                    <span className="text-sm font-medium opacity-90">Live Poll</span>
                                    {isMinimized && (
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                            {getTotalVotes(activePoll)} votes
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Minimize/Expand button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                        title={isMinimized ? "Expand Poll" : "Minimize Poll"}
                                    >
                                        {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
                                    </button>
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onClosePoll(activePoll.id); }}
                                                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                                title="Close Poll"
                                            >
                                                <Lock size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeletePoll(activePoll.id); }}
                                                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                                title="Delete Poll"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {!isMinimized && (
                                <h3 className="font-bold mt-2">{activePoll.question}</h3>
                            )}
                        </div>

                        {/* Poll Content - Hidden when minimized */}
                        <AnimatePresence>
                            {!isMinimized && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Poll Options */}
                                    <div className="p-4 space-y-2">
                                        {getPollOptions(activePoll).map((option) => {
                                            const totalVotes = getTotalVotes(activePoll);
                                            const voteCount = option?.votes?.length || 0;
                                            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                                            const userVoted = getUserVote(activePoll);
                                            const isSelected = userVoted === option.id;

                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => onVotePoll(activePoll.id, option.id)}
                                                    className={`w-full relative overflow-hidden rounded-xl border-2 transition-all ${isSelected
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                                                        }`}
                                                >
                                                    {/* Progress bar background */}
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.5 }}
                                                        className={`absolute inset-0 ${isSelected ? 'bg-indigo-200' : 'bg-gray-100'}`}
                                                    />

                                                    {/* Content */}
                                                    <div className="relative flex items-center justify-between p-3">
                                                        <div className="flex items-center gap-2">
                                                            {isSelected && (
                                                                <Check size={16} className="text-indigo-600" />
                                                            )}
                                                            <span className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                                                                {option.text}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                                                                {Math.round(percentage)}%
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                ({voteCount})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Poll Footer */}
                                    <div className="px-4 pb-4 flex items-center justify-between text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Users size={14} />
                                            <span>{getTotalVotes(activePoll)} votes</span>
                                        </div>
                                        {getUserVote(activePoll) !== null && (
                                            <span className="text-indigo-600 font-medium">✓ You voted</span>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Poll Modal */}
            {createPortal(
                <AnimatePresence>
                    {showCreateModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]"
                            onClick={() => setShowCreateModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 size={20} />
                                            <h3 className="font-bold text-lg">Create Poll</h3>
                                        </div>
                                        <button
                                            onClick={() => setShowCreateModal(false)}
                                            className="p-1 hover:bg-white/20 rounded transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Content */}
                                <div className="p-4 space-y-4">
                                    {/* Question */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Question
                                        </label>
                                        <input
                                            type="text"
                                            value={question}
                                            onChange={(e) => setQuestion(e.target.value)}
                                            placeholder="What should we discuss first?"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Options */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Options
                                        </label>
                                        <div className="space-y-2">
                                            {options.map((option, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={option}
                                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                                        placeholder={`Option ${index + 1}`}
                                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                    />
                                                    {options.length > 2 && (
                                                        <button
                                                            onClick={() => handleRemoveOption(index)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {options.length < 6 && (
                                            <button
                                                onClick={handleAddOption}
                                                className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                            >
                                                <Plus size={16} />
                                                Add Option
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-4 bg-gray-50 flex gap-3">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreatePoll}
                                        disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                                        className="flex-1 py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                                    >
                                        Create Poll
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default Poll;
