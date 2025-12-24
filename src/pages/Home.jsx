import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users, Sparkles, TrendingUp, ArrowRight, ArrowLeft, X, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import Tour, { HOME_TOUR_STEPS } from '../components/Tour';
import { useToast } from '../components/Toast';
import { database } from '../firebase';
import { ref, set, get } from 'firebase/database';
import { userService, sanitizeEmail } from '../services/userService';
import { Clock } from 'lucide-react';
import { COLUMN_COLORS } from '../store/useBoard';

const Home = () => {
    const [name, setName] = useState(localStorage.getItem('crisp_user_name') || '');
    const [boardName, setBoardName] = useState('');
    const [boardId, setBoardId] = useState('');
    const [recentBoards, setRecentBoards] = useState([]);
    const [userTemplates, setUserTemplates] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Board Creation Wizard State
    const [creationStep, setCreationStep] = useState(1); // 1: Name/Mode, 2: Custom Columns, 3: Template Prompt
    const [creationMode, setCreationMode] = useState('default'); // 'default', 'custom', 'template'
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [pendingBoardData, setPendingBoardData] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null); // { type: 'template' | 'history', id: string, name: string }
    const [customColumns, setCustomColumns] = useState([
        { id: '1', title: 'What went Well', color: 'bg-green-50 border-green-200', titleColor: 'text-green-900' },
        { id: '2', title: "Didn't go Well", color: 'bg-red-50 border-red-200', titleColor: 'text-red-900' },
        { id: '3', title: 'What can be improved', color: 'bg-yellow-50 border-yellow-200', titleColor: 'text-yellow-900' }
    ]);

    // Helper to fix legacy/bad transparent colors in templates
    const fixLegacyColors = (color, type = 'bg') => {
        if (!color) return type === 'bg' ? 'bg-slate-50 border-slate-200' : 'text-slate-900';
        if (color.includes('/') || color.includes('emerald') || color.includes('rose') || color.includes('amber')) {
            // Map legacy or experimental colors back to steady solid ones
            if (color.includes('green') || color.includes('emerald')) return type === 'bg' ? 'bg-green-50 border-green-200' : 'text-green-900';
            if (color.includes('red') || color.includes('rose')) return type === 'bg' ? 'bg-red-50 border-red-200' : 'text-red-900';
            if (color.includes('yellow') || color.includes('amber')) return type === 'bg' ? 'bg-yellow-50 border-yellow-200' : 'text-yellow-900';
            if (color.includes('purple') || color.includes('violet')) return type === 'bg' ? 'bg-purple-50 border-purple-200' : 'text-purple-900';
            if (color.includes('blue') || color.includes('sky')) return type === 'bg' ? 'bg-blue-50 border-blue-200' : 'text-blue-900';
            if (color.includes('orange')) return type === 'bg' ? 'bg-orange-50 border-orange-200' : 'text-orange-900';
            return type === 'bg' ? 'bg-slate-50 border-slate-200' : 'text-slate-900';
        }
        return color;
    };
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
        const userEmail = localStorage.getItem('crisp_user_email');
        const userName = localStorage.getItem('crisp_user_name');
        const joinId = searchParams.get('join');

        // Allow guest access if joining, otherwise require login
        if (!userEmail && !joinId) {
            navigate('/login');
            return;
        }

        // Fetch History & Templates only if logged in
        if (userEmail) {
            const loadData = async () => {
                const [history, templates] = await Promise.all([
                    userService.getUserBoardHistory(userEmail),
                    userService.getUserTemplates(userEmail)
                ]);
                setRecentBoards(history);
                setUserTemplates(templates);
                setIsLoadingHistory(false);
            };
            loadData();
        }

        // Ensure user has a unique ID
        if (userEmail) {
            localStorage.setItem('crisp_user_id', sanitizeEmail(userEmail));
        } else if (!localStorage.getItem('crisp_user_id')) {
            localStorage.setItem('crisp_user_id', crypto.randomUUID());
        }

        if (joinId) {
            setBoardId(joinId);
        }
    }, [searchParams, navigate]);

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
                    const onlineUsers = boardData.onlineUsers || {};

                    const lowerCaseUsername = username.trim().toLowerCase();

                    // 1. Check if any note has the same author name but different userId
                    const existingNoteAuthors = Object.values(notes)
                        .some(note => note.author && note.author.toLowerCase() === lowerCaseUsername && note.authorId !== userId);

                    if (existingNoteAuthors) return true;

                    // 2. Check online users
                    const existingOnlineUsers = Object.values(onlineUsers)
                        .some(user => user.name && user.name.toLowerCase() === lowerCaseUsername && user.id !== userId);

                    return existingOnlineUsers;
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

        // Determine columns
        let columnsData = {};
        if (creationMode === 'default') {
            columnsData = {
                'col-1': { id: 'col-1', title: 'What went Well', color: 'bg-green-50 border-green-200', titleColor: 'text-green-900', order: 0 },
                'col-2': { id: 'col-2', title: "Didn't go Well", color: 'bg-red-50 border-red-200', titleColor: 'text-red-900', order: 1 },
                'col-3': { id: 'col-3', title: 'What can be improved', color: 'bg-yellow-50 border-yellow-200', titleColor: 'text-yellow-900', order: 2 },
                'col-4': { id: 'col-4', title: 'Kudos', color: 'bg-purple-50 border-purple-200', titleColor: 'text-purple-900', order: 3 }
            };
        } else if (creationMode === 'template' && selectedTemplate) {
            selectedTemplate.columns.forEach((col, idx) => {
                const colId = col.id || `col-${idx}`;
                columnsData[colId] = {
                    ...col,
                    id: colId,
                    color: fixLegacyColors(col.color, 'bg'),
                    titleColor: fixLegacyColors(col.titleColor, 'text'),
                    order: idx
                };
            });
        } else {
            customColumns.forEach((col, idx) => {
                columnsData[col.id] = {
                    id: col.id,
                    title: col.title,
                    color: fixLegacyColors(col.color, 'bg'),
                    titleColor: fixLegacyColors(col.titleColor, 'text'),
                    order: idx
                };
            });
        }

        const initialData = {
            name: boardName,
            adminId: userId,
            notes: {},
            columns: columnsData,
            timer: {
                isRunning: false,
                timeLeft: 180,
                lastUpdated: Date.now(),
                duration: 180
            },
            music: {
                isPlaying: false
            },
            createdAt: Date.now()
        };

        // If it was a custom board, we might want to ask to save as template
        // But the user said: "once user added requried column and finish, it should ask for Do you want to save this as Templete"
        // So we should handle that transition.

        if (creationMode === 'custom' && creationStep === 2) {
            setPendingBoardData({ id: newBoardId, data: initialData });
            setCreationStep(3); // Move to template prompt
            setBoardId(newBoardId);
            return;
        }

        await finalizeBoardCreation(newBoardId, initialData);
    };

    const finalizeBoardCreation = async (newBoardId, boardData) => {
        localStorage.setItem(`crisp_board_${newBoardId}`, JSON.stringify(boardData));

        if (database) {
            try {
                await set(ref(database, `boards/${newBoardId}`), boardData);

                // Save to History ONLY if logged in (Admin behavior)
                const userEmail = localStorage.getItem('crisp_user_email');
                if (userEmail) {
                    await userService.saveBoardToHistory(userEmail, {
                        id: newBoardId,
                        name: boardData.name
                    });
                }
            } catch (error) {
                console.error("Error creating board in Firebase:", error);
            }
        }

        navigate(`/board/${newBoardId}`);
    };

    const handleSaveTemplate = async (save) => {
        if (save && pendingBoardData) {
            const userEmail = localStorage.getItem('crisp_user_email');
            await userService.saveTemplate(userEmail, {
                name: boardName + " Template",
                columns: customColumns.map((c, i) => ({
                    id: `col-${i}`,
                    title: c.title,
                    color: c.color || 'bg-slate-50 border-slate-200',
                    titleColor: c.titleColor || 'text-slate-800',
                    order: i
                }))
            });
            toast.success("Template saved!");
        }

        if (pendingBoardData) {
            await finalizeBoardCreation(pendingBoardData.id, pendingBoardData.data);
        }
    };

    const addCustomColumn = () => {
        const newCol = {
            id: `col-${Date.now()}`,
            title: 'New Column',
            color: 'bg-slate-50 border-slate-200',
            titleColor: 'text-slate-900'
        };
        setCustomColumns([...customColumns, newCol]);
    };

    const removeCustomColumn = (id) => {
        if (customColumns.length <= 1) {
            toast.warning("At least one column is required");
            return;
        }
        setCustomColumns(customColumns.filter(c => c.id !== id));
    };

    const updateCustomColumn = (id, updates) => {
        setCustomColumns(customColumns.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleJoinBoard = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.warning('Please enter your name first');
            return;
        }
        if (!boardId.trim()) {
            toast.warning('Please enter a Board ID to join');
            return;
        }

        // Check for duplicate username
        const isDuplicate = await checkDuplicateUsername(boardId, name);
        if (isDuplicate) {
            toast.error(`The name "${name}" is already taken. Please use a different name.`);
            return;
        }

        localStorage.setItem('crisp_user_name', name);
        navigate(`/board/${boardId}`);
    };

    const handleDeleteTemplate = async (e, templateId) => {
        e.stopPropagation();
        const template = userTemplates.find(t => t.id === templateId);
        setItemToDelete({ type: 'template', id: templateId, name: template?.name });
    };

    const handleDeleteHistory = async (e, boardId) => {
        e.stopPropagation();
        const board = recentBoards.find(b => b.id === boardId);
        setItemToDelete({ type: 'history', id: boardId, name: board?.name });
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        const userEmail = localStorage.getItem('crisp_user_email');
        if (!userEmail) return;

        try {
            if (itemToDelete.type === 'template') {
                await userService.deleteTemplate(userEmail, itemToDelete.id);
                setUserTemplates(prev => prev.filter(t => t.id !== itemToDelete.id));
                toast.success('Template deleted');
                if (selectedTemplate?.id === itemToDelete.id) {
                    setSelectedTemplate(null);
                    setCreationMode('default');
                }
            } else {
                await userService.deleteBoardFromHistory(userEmail, itemToDelete.id);
                setRecentBoards(prev => prev.filter(b => b.id !== itemToDelete.id));
                toast.success('Board removed from history');
            }
        } catch (error) {
            toast.error('Failed to delete');
        } finally {
            setItemToDelete(null);
        }
    };

    const isLoggedIn = !!localStorage.getItem('crisp_user_email');

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
                                <span className="text-gray-300">Real-time Collaboration</span>
                            </div>
                            <span className="text-gray-600">•</span>
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-cyan-400" />
                                <span className="text-gray-300">Smart Analytics</span>
                            </div>
                            <span className="text-gray-600">•</span>
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-purple-400" />
                                <span className="text-gray-300">Team Insights</span>
                            </div>
                        </div>
                    </div >

                    {/* Main Card */}
                    <div className="max-w-md mx-auto">
                        <div className="relative group">
                            {/* Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>

                            {/* Glass Card */}
                            <div className="relative bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-cyan-500/20 shadow-2xl overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-2xl pointer-events-none"></div>

                                <div className="relative space-y-6">
                                    {creationStep === 1 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                            {/* Name Input - Only for Guests */}
                                            {!isLoggedIn && (
                                                <div className="relative">
                                                    <input
                                                        ref={nameInputRef}
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="Enter your name"
                                                        className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all backdrop-blur-sm"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                                        <Users size={16} />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-4">
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

                                                {!boardId && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={() => setCreationMode('default')}
                                                            className={`p-3 rounded-lg border text-sm transition-all ${creationMode === 'default' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                                        >
                                                            Default Columns
                                                        </button>
                                                        <button
                                                            onClick={() => setCreationMode('custom')}
                                                            className={`p-3 rounded-lg border text-sm transition-all ${creationMode === 'custom' ? 'bg-purple-500/20 border-purple-400 text-purple-300' : 'bg-slate-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                                        >
                                                            Custom Columns
                                                        </button>
                                                    </div>
                                                )}

                                                {isLoggedIn && userTemplates.length > 0 && !boardId && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs text-gray-500 font-medium px-1 uppercase tracking-wider">Use a Template</label>
                                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                                            {userTemplates.map(t => (
                                                                <div key={t.id} className="relative group/template flex-shrink-0">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedTemplate(t);
                                                                            setCreationMode('template');
                                                                        }}
                                                                        className={`px-3 py-2 pr-8 rounded-lg border text-xs whitespace-nowrap transition-all ${selectedTemplate?.id === t.id && creationMode === 'template' ? 'bg-pink-500/20 border-pink-400 text-pink-300' : 'bg-slate-800/50 border-gray-700 text-gray-400 hover:border-gray-600'}`}
                                                                    >
                                                                        {t.name}
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleDeleteTemplate(e, t.id)}
                                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-rose-400 opacity-0 group-hover/template:opacity-100 transition-all"
                                                                        title="Delete template"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!boardId && creationMode === 'custom') {
                                                        if (!boardName.trim()) { toast.warning('Please enter a board name'); return; }
                                                        setCreationStep(2);
                                                    } else {
                                                        !boardId ? handleCreateBoard() : undefined;
                                                    }
                                                }}
                                                disabled={!!boardId}
                                                className={`w-full relative group/btn overflow-hidden rounded-xl ${boardId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 ${boardId ? 'opacity-50' : 'opacity-100 group-hover/btn:opacity-90'} transition-opacity`}></div>
                                                <div className="relative flex items-center justify-center gap-2 py-4 px-6 font-semibold text-white">
                                                    {creationMode === 'custom' && !boardId ? <ArrowRight size={20} /> : <Plus size={20} />}
                                                    <span>{boardId ? 'Use Join Button Below' : (creationMode === 'custom' ? 'Configure Columns' : 'Create New Board')}</span>
                                                </div>
                                                {!boardId && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>}
                                            </button>
                                        </div>
                                    )}

                                    {creationStep === 2 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-white font-semibold">Custom Columns</h3>
                                                <button onClick={() => setCreationStep(1)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                                                    <ArrowLeft size={12} /> Back
                                                </button>
                                            </div>

                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                {customColumns.map((col, idx) => (
                                                    <div key={col.id} className="space-y-2 p-3 bg-slate-800/30 rounded-xl border border-gray-800 animate-in zoom-in-95 duration-200">
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={col.title}
                                                                onChange={(e) => updateCustomColumn(col.id, { title: e.target.value })}
                                                                className="flex-1 px-3 py-2 bg-slate-800/50 border border-gray-700 rounded-lg text-white text-sm outline-none focus:border-purple-500 transition-all font-medium"
                                                                placeholder="Column Title"
                                                            />
                                                            <button
                                                                onClick={() => removeCustomColumn(col.id)}
                                                                className="p-2 text-gray-500 hover:text-rose-400 transition-colors"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                                            {COLUMN_COLORS.map((colorOption) => (
                                                                <button
                                                                    key={colorOption.id}
                                                                    onClick={() => updateCustomColumn(col.id, {
                                                                        color: colorOption.color,
                                                                        titleColor: colorOption.titleColor
                                                                    })}
                                                                    className={`w-6 h-6 rounded-full ${colorOption.previewColor} border-2 transition-all ${(col.color === colorOption.color)
                                                                            ? 'border-white scale-110 ring-2 ring-purple-500/20'
                                                                            : 'border-transparent hover:scale-110'
                                                                        }`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={addCustomColumn}
                                                    className="w-full py-3 border border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-cyan-400 hover:border-cyan-400/50 transition-all text-xs flex items-center justify-center gap-2 bg-slate-800/20"
                                                >
                                                    <Plus size={14} /> Add Column
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleCreateBoard}
                                                className="w-full relative group/btn overflow-hidden rounded-xl"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-100 group-hover/btn:opacity-90 transition-opacity"></div>
                                                <div className="relative flex items-center justify-center gap-2 py-4 px-6 font-semibold text-white">
                                                    <Plus size={20} />
                                                    <span>Finish & Create</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {creationStep === 3 && (
                                        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
                                            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Sparkles className="text-cyan-400" size={32} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold text-white">Save as Template?</h3>
                                                <p className="text-sm text-gray-400">Reuse these columns for your next retrospectives.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleSaveTemplate(false)}
                                                    className="py-3 px-4 rounded-xl bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors"
                                                >
                                                    No Thanks
                                                </button>
                                                <button
                                                    onClick={() => handleSaveTemplate(true)}
                                                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                                                >
                                                    Yes, Save
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {creationStep === 1 && (
                                        <>
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

                                            {/* Recent Boards Dropdown (if any) */}
                                            {recentBoards.length > 0 && !boardId && (
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                                        <Clock size={14} /> Recent Boards (Last 30 Days)
                                                    </label>
                                                    <div className="max-h-32 overflow-y-auto bg-slate-800/50 rounded-lg border border-gray-700/50 custom-scrollbar">
                                                        {recentBoards.map((board) => (
                                                            <div key={board.id} className="group/item flex items-center border-b border-gray-700/30 last:border-0 hover:bg-white/5">
                                                                <button
                                                                    onClick={() => navigate(`/board/${board.id}`)}
                                                                    className="flex-1 text-left px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors flex justify-between items-center overflow-hidden"
                                                                >
                                                                    <span className="truncate">{board.name}</span>
                                                                    <span className="text-[10px] text-gray-500 ml-2 whitespace-nowrap">
                                                                        {new Date(board.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteHistory(e, board.id)}
                                                                    className="p-2 text-gray-500 hover:text-rose-400 opacity-0 group-hover/item:opacity-100 transition-all border-l border-gray-700/30"
                                                                    title="Remove from history"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

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
                                        </>
                                    )}
                                </div>
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

                {/* Deletion Confirmation Modal */}
                {itemToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setItemToDelete(null)}></div>
                        <div className="relative bg-slate-900 border border-rose-500/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="text-rose-500" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white text-center mb-2">Delete {itemToDelete.type === 'template' ? 'Template' : 'History Item'}?</h3>
                            <p className="text-sm text-gray-400 text-center mb-6">
                                Are you sure you want to delete <span className="text-white font-medium">"{itemToDelete.name}"</span>? This action cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    className="py-2.5 px-4 rounded-xl bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="py-2.5 px-4 rounded-xl bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-all text-sm"
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div >

        </Layout >
    );
};

export default Home;
