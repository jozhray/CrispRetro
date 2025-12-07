import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users, Sparkles, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';
import Tour, { HOME_TOUR_STEPS } from '../components/Tour';
import { useToast } from '../components/Toast';
import { database } from '../firebase';
import { ref, set, get } from 'firebase/database';

const Home = () => {
    const [name, setName] = useState(localStorage.getItem('crisp_user_name') || '');
    const [boardName, setBoardName] = useState('');
    const [boardId, setBoardId] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const nameInputRef = React.useRef(null);

    const handleTourComplete = () => {
        // Small delay to ensure modal is closed and focus is available
        setTimeout(() => {
            nameInputRef.current?.focus();
        }, 100);
    };

    useEffect(() => {
        // Ensure user has a unique ID
        if (!localStorage.getItem('crisp_user_id')) {
            localStorage.setItem('crisp_user_id', crypto.randomUUID());
        }

        const joinId = searchParams.get('join');
        if (joinId) {
            setBoardId(joinId);
        }
    }, [searchParams]);

    // Check if username already exists in the board
    const checkDuplicateUsername = async (boardId, username) => {
        const userId = localStorage.getItem('crisp_user_id');

        // Try Firebase first
        if (database) {
            try {
                const boardRef = ref(database, `boards/${boardId}`);
                const snapshot = await get(boardRef);

                if (snapshot.exists()) {
                    const boardData = snapshot.val();
                    const notes = boardData.notes || {};

                    // Check if any note has the same author name but different userId (case-insensitive)
                    const existingAuthors = Object.values(notes)
                        .filter(note => note.author && note.author.toLowerCase() === username.trim().toLowerCase() && note.authorId !== userId);

                    return existingAuthors.length > 0;
                }
            } catch (error) {
                console.error("Error checking username in Firebase:", error);
            }
        }

        // Fallback to LocalStorage
        const localData = localStorage.getItem(`crisp_board_${boardId}`);
        if (localData) {
            const boardData = JSON.parse(localData);
            const notes = boardData.notes || {};

            const existingAuthors = Object.values(notes)
                .filter(note => note.author && note.author.toLowerCase() === username.trim().toLowerCase() && note.authorId !== userId);

            return existingAuthors.length > 0;
        }

        return false;
    };

    const handleCreateBoard = async () => {
        if (!name.trim()) {
            toast.warning('Please enter your name first');
            return;
        }
        if (!boardName.trim()) {
            toast.warning('Please enter a board name');
            return;
        }

        localStorage.setItem('crisp_user_name', name);
        const userId = localStorage.getItem('crisp_user_id');
        const newBoardId = crypto.randomUUID();

        const initialData = {
            name: boardName,
            adminId: userId,
            notes: {},
            timer: {
                isRunning: false,
                timeLeft: 180,
                lastUpdated: Date.now()
            },
            music: {
                isPlaying: false
            }
        };

        localStorage.setItem(`crisp_board_${newBoardId}`, JSON.stringify(initialData));

        if (database) {
            try {
                await set(ref(database, `boards/${newBoardId}`), initialData);
            } catch (error) {
                console.error("Error creating board in Firebase:", error);
            }
        }

        navigate(`/board/${newBoardId}`);
    };

    const handleJoinBoard = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.warning('Please enter your name first');
            return;
        }
        if (!boardId.trim()) return;

        // Check for duplicate username
        const isDuplicate = await checkDuplicateUsername(boardId, name);
        if (isDuplicate) {
            toast.error(`The name "${name}" is already taken. Please use a different name.`);
            return;
        }

        navigate(`/board/${boardId}`);
    };

    return (
        <Layout>
            {/* Onboarding Tour */}
            <Tour
                steps={HOME_TOUR_STEPS}
                storageKey="crisp_home_tour_completed"
                onComplete={handleTourComplete}
            />
            <div className="min-h-screen relative overflow-hidden">
                {/* Animated Background */}
                <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                    <div className="absolute inset-0 opacity-30">
                        <img
                            src="/hero-bg.jpg"
                            alt="background"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900"></div>

                    {/* Animated Particles */}
                    <div className="absolute inset-0">
                        {
                            [...Array(20)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute rounded-full bg-cyan-400/20 blur-xl animate-pulse"
                                    style={{
                                        width: Math.random() * 100 + 50 + 'px',
                                        height: Math.random() * 100 + 50 + 'px',
                                        left: Math.random() * 100 + '%',
                                        top: Math.random() * 100 + '%',
                                        animationDelay: Math.random() * 5 + 's',
                                        animationDuration: Math.random() * 3 + 3 + 's'
                                    }}
                                />
                            ))
                        }
                    </div >
                </div >

                {/* Content */}
                < div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 pb-8" >
                    {/* Hero Section */}
                    < div className="text-center mb-8" >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-400/30 rounded-full text-cyan-300 text-sm mb-4 backdrop-blur-sm">
                            <Sparkles size={16} className="animate-pulse" />
                            <span>Next-Gen Retrospective Platform</span>
                        </div>

                        {/* Logo + Title Inline */}
                        <h1 className="flex items-center justify-center gap-4 text-5xl md:text-6xl font-bold mb-4">
                            <img
                                src="/logo.png"
                                alt="CrispRetro Logo"
                                className="w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                            />
                            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                                CrispRetro
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-300 mb-3 drop-shadow-lg">
                            Transform your team retrospectives with
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 text-cyan-300 text-sm">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={18} className="text-pink-400" />
                                <span>Real-time Collaboration</span>
                            </div>
                            <span className="text-gray-600">•</span>
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-cyan-400" />
                                <span>Smart Analytics</span>
                            </div>
                            <span className="text-gray-600">•</span>
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-purple-400" />
                                <span>Team Insights</span>
                            </div>
                        </div>
                    </div >

                    {/* Main Card */}
                    < div className="max-w-md mx-auto" >
                        <div className="relative group">
                            {/* Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>

                            {/* Glass Card */}
                            <div className="relative bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-cyan-500/20 shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-2xl"></div>

                                <div className="relative space-y-6">
                                    {/* Name Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-cyan-300 mb-2">
                                            Your Name
                                        </label>
                                        <input
                                            id="user-name"
                                            ref={nameInputRef}
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                                        />
                                    </div>

                                    {/* Board Name Input - disabled when joining */}
                                    <div>
                                        <label className="block text-sm font-medium text-purple-300 mb-2">
                                            Board Name {boardId && <span className="text-gray-500 text-xs">(joining existing board)</span>}
                                        </label>
                                        <input
                                            id="board-name"
                                            type="text"
                                            value={boardName}
                                            onChange={(e) => setBoardName(e.target.value)}
                                            placeholder={boardId ? "Not needed when joining" : "Sprint 42 Retro"}
                                            disabled={!!boardId}
                                            className={`w-full px-4 py-3 bg-slate-800/50 border rounded-lg text-white placeholder-gray-500 outline-none transition-all backdrop-blur-sm ${boardId
                                                ? 'border-gray-600 cursor-not-allowed opacity-50'
                                                : 'border-purple-500/30 focus:ring-2 focus:ring-purple-400 focus:border-transparent'
                                                }`}
                                        />
                                    </div>

                                    {/* Create Button - disabled when joining */}
                                    <button
                                        type="button"
                                        onClick={!boardId ? handleCreateBoard : undefined}
                                        disabled={!!boardId}
                                        className={`w-full relative group/btn overflow-hidden rounded-xl ${boardId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 ${boardId ? 'opacity-50' : 'opacity-100 group-hover/btn:opacity-90'} transition-opacity`}></div>
                                        <div className="relative flex items-center justify-center gap-2 py-4 px-6 font-semibold text-white">
                                            <Plus size={20} />
                                            <span>{boardId ? 'Use Join Button Below' : 'Create New Board'}</span>
                                        </div>
                                        {!boardId && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>}
                                    </button>

                                    {/* Divider */}
                                    <div className="relative py-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-cyan-500/20"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="px-4 bg-slate-900/80 text-sm text-gray-400">
                                                Or join existing
                                            </span>
                                        </div>
                                    </div>

                                    {/* Join Form */}
                                    <form onSubmit={handleJoinBoard} className="flex gap-2">
                                        <input
                                            id="join-board"
                                            type="text"
                                            value={boardId}
                                            onChange={(e) => setBoardId(e.target.value)}
                                            placeholder={boardName ? "Not needed for new board" : "Enter Board ID"}
                                            disabled={!!boardName}
                                            className={`flex-1 px-4 py-3 bg-slate-800/50 border rounded-lg text-white placeholder-gray-500 outline-none transition-all backdrop-blur-sm ${boardName
                                                ? 'border-gray-600 cursor-not-allowed opacity-50'
                                                : 'border-pink-500/30 focus:ring-2 focus:ring-pink-400 focus:border-transparent'
                                                }`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!!boardName}
                                            className={`text-white p-4 rounded-lg transition-all transform shadow-lg ${boardName
                                                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 hover:scale-105 active:scale-95 shadow-pink-500/25'
                                                }`}
                                        >
                                            <Users size={20} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* Features Grid */}
                        < div className="grid grid-cols-4 gap-4 mt-8" >
                            {
                                [
                                    { icon: '⏱️', label: 'Timer' },
                                    { icon: '🎵', label: 'Music' },
                                    { icon: '📊', label: 'Poll' },
                                    { icon: '📥', label: 'Export' }
                                ].map((feature, i) => (
                                    <div
                                        key={i}
                                        className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/10 rounded-xl p-4 text-center hover:border-cyan-500/30 transition-all group cursor-default"
                                    >
                                        <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                                            {feature.icon}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {feature.label}
                                        </div>
                                    </div>
                                ))
                            }
                        </div >
                    </div >
                </div >
            </div >
        </Layout >
    );
};

export default Home;
