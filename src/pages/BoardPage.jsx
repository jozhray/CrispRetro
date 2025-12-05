import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Download, Share2, ArrowLeft, Wifi, WifiOff, ChevronDown, Plus, X, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Layout from '../components/Layout';
import Column from '../components/Board/Column';
import Timer from '../components/Board/Timer';
import MusicPlayer from '../components/Board/MusicPlayer';
import Poll from '../components/Board/Poll';
import Tour, { BOARD_TOUR_STEPS_ADMIN, BOARD_TOUR_STEPS_USER } from '../components/Tour';
import { useToast } from '../components/Toast';
import { useBoard, COLUMN_COLORS } from '../store/useBoard';

const BoardPage = () => {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showUserList, setShowUserList] = useState(false);
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLUMN_COLORS[4]); // Default blue
    const boardRef = useRef(null);
    const exportMenuRef = useRef(null);
    const userListRef = useRef(null);
    const currentUser = localStorage.getItem('crisp_user_name') || 'Anonymous';
    const toast = useToast();

    const {
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
        moveNote,
        getNotesByColumn,
        updateBoardName,
        updateTimer,
        updateMusic,
        createPoll,
        votePoll,
        closePoll,
        deletePoll,
        clearAllNotes
    } = useBoard(boardId);

    // Redirect if no user name found
    React.useEffect(() => {
        if (!currentUser || currentUser === 'Anonymous') {
            const storedName = localStorage.getItem('crisp_user_name');
            if (!storedName) {
                navigate(`/?join=${boardId}`);
            }
        }
    }, [currentUser, boardId, navigate]);

    const handleAddNote = (columnId) => {
        const currentUserId = localStorage.getItem('crisp_user_id');
        addNote(columnId, '', currentUser, currentUserId);
    };

    // Close Export Menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };

        const handleClickOutsideUserList = (event) => {
            if (userListRef.current && !userListRef.current.contains(event.target)) {
                setShowUserList(false);
            }
        };

        if (showExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        if (showUserList) {
            document.addEventListener('mousedown', handleClickOutsideUserList);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousedown', handleClickOutsideUserList);
        };
    }, [showExportMenu, showUserList]);

    const handleAddColumn = () => {
        if (!newColumnTitle.trim()) return;
        addColumn(newColumnTitle.trim(), selectedColor);
        setNewColumnTitle('');
        setSelectedColor(COLUMN_COLORS[4]);
        setShowAddColumnModal(false);
    };

    const prepareExportData = () => {
        const exportData = [];

        // Check if data is available
        if (!columns || Object.keys(columns).length === 0) {
            console.log('Export: No columns found');
            return exportData;
        }
        if (!notes || Object.keys(notes).length === 0) {
            console.log('Export: No notes found');
            return exportData;
        }

        Object.values(columns).forEach(column => {
            // Get notes for this column directly from notes object
            const columnNotes = Object.values(notes)
                .filter(note => note.columnId === column.id)
                .sort((a, b) => (b.votes || 0) - (a.votes || 0));

            columnNotes.forEach(note => {
                exportData.push({
                    'Column': column.title,
                    'Note Content': note.content || '',
                    'Author': note.author || 'Anonymous',
                    'Votes': note.votes || 0,
                    'Created At': note.createdAt ? new Date(note.createdAt).toLocaleString() : 'N/A'
                });
            });
        });

        console.log('Export: Prepared', exportData.length, 'notes');
        return exportData;
    };

    const handleExportExcel = () => {
        try {
            if (!isFirebaseReady) {
                toast.warning('Please wait, data is still loading...');
                return;
            }

            const exportData = prepareExportData();
            if (exportData.length === 0) {
                toast.warning('No notes to export!');
                return;
            }

            const ws = XLSX.utils.json_to_sheet(exportData);
            const colWidths = [
                { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
            ];
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Retro Board");
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
            const nameToUse = boardName || 'Retro-Board';
            const safeName = nameToUse.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
            XLSX.writeFile(wb, `${safeName}_${timestamp}.xlsx`);
            setShowExportMenu(false);
            toast.success('Exported to Excel!');
        } catch (err) {
            console.error('Export failed', err);
            toast.error('Failed to export to Excel');
        }
    };

    const handleExportCSV = () => {
        try {
            if (!isFirebaseReady) {
                toast.warning('Please wait, data is still loading...');
                return;
            }

            const exportData = prepareExportData();
            if (exportData.length === 0) {
                toast.warning('No notes to export!');
                return;
            }

            const headers = ['Column', 'Note Content', 'Author', 'Votes', 'Created At'];
            const csvRows = [headers.join(',')];

            exportData.forEach(row => {
                const values = [
                    `"${row['Column']}"`,
                    `"${row['Note Content'].replace(/"/g, '""')}"`,
                    `"${row['Author']}"`,
                    row['Votes'],
                    `"${row['Created At']}"`
                ];
                csvRows.push(values.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
            const nameToUse = boardName || 'Retro-Board';
            const safeName = nameToUse.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
            a.download = `${safeName}_${timestamp}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            setShowExportMenu(false);
            toast.success('Exported to CSV!');
        } catch (err) {
            console.error('CSV export failed', err);
            toast.error('Failed to export to CSV');
        }
    };

    const handleExportPDF = () => {
        try {
            if (!isFirebaseReady) {
                toast.warning('Please wait, data is still loading...');
                return;
            }

            const exportData = prepareExportData();
            if (exportData.length === 0) {
                toast.warning('No notes to export!');
                return;
            }

            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(41, 128, 185); // Blue color
            doc.text(boardName, 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Board ID: ${boardId}`, 14, 28);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

            let lastY = 45;

            // Group notes by column for better display
            Object.values(columns).forEach(column => {
                const columnNotes = Object.values(notes)
                    .filter(note => note.columnId === column.id)
                    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

                if (columnNotes.length > 0) {
                    // Column Title
                    doc.setFontSize(14);
                    doc.setTextColor(0);
                    // Check if we need a new page for the title
                    if (lastY > 250) {
                        doc.addPage();
                        lastY = 20;
                    }
                    doc.text(column.title, 14, lastY);

                    // Table
                    const tableData = columnNotes.map(note => [
                        note.content || '',
                        note.author || 'Anonymous',
                        (note.votes || 0).toString()
                    ]);

                    autoTable(doc, {
                        startY: lastY + 5,
                        head: [['Note', 'Author', 'Votes']],
                        body: tableData,
                        theme: 'striped',
                        headStyles: { fillColor: [66, 66, 66] },
                        styles: { fontSize: 10, cellPadding: 3 },
                        columnStyles: {
                            0: { cellWidth: 'auto' },
                            1: { cellWidth: 40 },
                            2: { cellWidth: 20, halign: 'center' }
                        },
                        margin: { top: 20 },
                        didDrawPage: (data) => {
                            // Optional: Header on new pages could go here
                        }
                    });

                    lastY = doc.lastAutoTable.finalY + 15;
                }
            });

            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
            const nameToUse = boardName || 'Retro-Board';
            const safeName = nameToUse.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
            doc.save(`${safeName}_${timestamp}.pdf`);

            setShowExportMenu(false);
            toast.success('Exported to PDF!');
        } catch (err) {
            console.error('PDF export failed', err);
            toast.error('Failed to export to PDF');
        }
    };


    const handleExportJSON = () => {
        try {
            if (!isFirebaseReady) {
                toast.warning('Please wait, data is still loading...');
                return;
            }

            const exportData = {
                boardName,
                boardId,
                exportDate: new Date().toISOString(),
                columns: Object.values(columns).map(column => ({
                    id: column.id,
                    title: column.title,
                    color: column.color,
                    notes: Object.values(notes).filter(n => n.columnId === column.id)
                }))
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
            const nameToUse = boardName || 'Retro-Board';
            const safeName = nameToUse.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
            a.download = `${safeName}_${timestamp}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
            setShowExportMenu(false);
            toast.success('Exported to JSON!');
        } catch (err) {
            console.error('JSON export failed', err);
            toast.error('Failed to export to JSON');
        }
    };

    const handleShare = () => {
        if (!isFirebaseReady) {
            toast.warning('Local Mode: Others cannot see your changes until Firebase is configured.');
        }
        navigator.clipboard.writeText(window.location.href);
        toast.success('Board link copied to clipboard!');
    };

    const copyBoardId = () => {
        navigator.clipboard.writeText(boardId);
        toast.success('Board ID copied!');
    };

    // Determine grid columns based on number of columns
    const getGridCols = () => {
        const count = sortedColumns.length;
        if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
        if (count <= 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        if (count <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
    };

    return (
        <Layout>
            {/* Animated Background - Pleasant Bubbles */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-br from-slate-200 via-blue-100 to-indigo-200">
                {/* Floating Crisp Bubbles */}
                <div className="absolute inset-0 opacity-60">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full border-2 border-blue-400/40 bg-blue-300/10 animate-float"
                            style={{
                                width: Math.random() * 80 + 30 + 'px',
                                height: Math.random() * 80 + 30 + 'px',
                                left: Math.random() * 100 + '%',
                                bottom: -100 + 'px',
                                animationDelay: Math.random() * 5 + 's',
                                animationDuration: Math.random() * 15 + 15 + 's',
                            }}
                        />
                    ))}
                </div>

                {/* Gentle Wave Effect */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-60">
                    <div className="absolute bottom-0 left-0 w-[200%] h-full bg-gradient-to-t from-blue-300/30 via-blue-200/10 to-transparent animate-wave"
                        style={{ transform: 'translate3d(0,0,0)' }}></div>
                    <div className="absolute bottom-0 left-0 w-[200%] h-3/4 bg-gradient-to-t from-indigo-300/20 via-purple-200/10 to-transparent animate-wave-slow"
                        style={{ transform: 'translate3d(0,0,0)', animationDelay: '-5s' }}></div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
                }
                @keyframes wave {
                    0% { transform: translateX(0); }
                    50% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }
                }
                @keyframes wave-slow {
                    0% { transform: translateX(-50%); }
                    50% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-float {
                    animation-name: float;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                }
                .animate-wave {
                    animation: wave 20s ease-in-out infinite;
                }
                .animate-wave-slow {
                    animation: wave-slow 30s ease-in-out infinite;
                }
            `}</style>

            {/* Onboarding Tour - Different steps for admin vs user */}
            <Tour
                steps={isAdmin ? BOARD_TOUR_STEPS_ADMIN : BOARD_TOUR_STEPS_USER}
                storageKey={isAdmin ? 'crisp_board_admin_tour_completed' : 'crisp_board_user_tour_completed'}
            />

            <div className="relative z-10 flex flex-col h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">
                    {/* Top Row: Title & Main Info */}
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                                onClick={() => navigate('/')}
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex-shrink-0"
                            >
                                <ArrowLeft size={20} />
                            </button>

                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <input
                                    type="text"
                                    value={boardName}
                                    onChange={(e) => isAdmin && updateBoardName(e.target.value)}
                                    readOnly={!isAdmin}
                                    className={`text-2xl font-bold text-gray-800 bg-transparent border border-transparent rounded px-1 -ml-1 outline-none truncate transition-all ${isAdmin ? 'hover:border-gray-200 focus:border-blue-300' : 'cursor-default'}`}
                                />

                            </div>

                        </div>


                        {/* Live/Local Indicator - Centered */}
                        <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex justify-center mt-2 md:mt-0 z-20 pointer-events-none">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shadow-sm border backdrop-blur-sm ${isFirebaseReady ? 'bg-green-100/80 text-green-700 border-green-200/50' : 'bg-orange-100/80 text-orange-700 border-orange-200/50'}`}>
                                {isFirebaseReady ? <Wifi size={12} className="animate-pulse" /> : <WifiOff size={12} />}
                                <span>{isFirebaseReady ? 'Live' : 'Local Mode'}</span>
                            </div>
                        </div>

                        {/* Online Users - Right Side */}
                        {onlineUsers.length > 0 && (
                            <div className="relative flex items-center gap-2 flex-shrink-0 justify-end z-[60]" ref={userListRef}>
                                <button
                                    onClick={() => setShowUserList(!showUserList)}
                                    className="flex items-center gap-2 p-1 hover:bg-white/40 rounded-full transition-colors outline-none focus:ring-2 focus:ring-blue-300 group"
                                    title="Show all online users"
                                >
                                    <span className="text-xs font-medium text-gray-500 hidden lg:inline mr-1 group-hover:text-gray-700">
                                        {onlineUsers.length} online
                                    </span>
                                    <div className="flex items-center -space-x-2 group-hover:space-x-0.5 transition-all">
                                        {onlineUsers.slice(0, 4).map((user, index) => (
                                            <div
                                                key={user.id}
                                                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-transparent transition-all cursor-pointer relative"
                                                style={{ zIndex: 30 - index }}
                                            >
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                        {onlineUsers.length > 4 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-bold shadow-sm z-30">
                                                +{onlineUsers.length - 4}
                                            </div>
                                        )}
                                    </div>
                                </button>

                                {/* User List Dropdown */}
                                {showUserList && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                            <h3 className="text-sm font-semibold text-gray-700">Online Members</h3>
                                            <p className="text-xs text-gray-500">{onlineUsers.length} active now</p>
                                        </div>
                                        <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                                            {onlineUsers.map(user => (
                                                <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-blue-50/50 rounded-lg transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-gray-800 truncate">{user.name}</div>
                                                        {user.id === localStorage.getItem('crisp_user_id') && (
                                                            <div className="text-[10px] text-blue-500 font-medium">You</div>
                                                        )}
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Unified Toolbar - Visible to ALL Users */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm relative z-50">
                        {/* Session Controls Group (Timer, Music, Poll) */}
                        <div className="flex flex-nowrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
                                <Timer timer={timer} isAdmin={isAdmin} onUpdateTimer={updateTimer} music={music} onUpdateMusic={updateMusic} />
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <MusicPlayer music={music} isAdmin={isAdmin} onUpdateMusic={updateMusic} />
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <Poll
                                    polls={polls}
                                    activePoll={activePoll}
                                    isAdmin={isAdmin}
                                    onCreatePoll={createPoll}
                                    onVotePoll={votePoll}
                                    onClosePoll={closePoll}
                                    onDeletePoll={deletePoll}
                                    currentUserId={localStorage.getItem('crisp_user_id')}
                                />
                            </div>

                        </div>

                        {/* Utilities Group (Search, Invite, Export) */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-3 h-[46px] bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-48 transition-all shadow-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 h-[46px] bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 rounded-xl border border-transparent transition-all shadow-sm hover:shadow text-sm font-medium whitespace-nowrap"
                                >
                                    <Share2 size={16} />
                                    <span className="hidden sm:inline">Invite</span>
                                </button>



                                {/* Export - Admin Only */}
                                {isAdmin && (
                                    <div className="relative" ref={exportMenuRef}>
                                        <button
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            className="flex items-center gap-2 h-[46px] bg-gray-900 hover:bg-black text-white px-3 rounded-xl transition-all shadow-sm hover:shadow text-sm font-medium whitespace-nowrap"
                                        >
                                            <Download size={16} />
                                            <span className="hidden lg:inline">Export</span>
                                            <ChevronDown size={14} />
                                        </button>
                                        {showExportMenu && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Export As</div>
                                                <button onClick={handleExportExcel} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 transition-colors flex items-center gap-2 text-sm">
                                                    <span>📊</span> Excel
                                                </button>
                                                <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 transition-colors flex items-center gap-2 text-sm">
                                                    <span>📄</span> CSV
                                                </button>
                                                <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 transition-colors flex items-center gap-2 text-sm">
                                                    <span>📑</span> PDF
                                                </button>
                                                <button onClick={handleExportJSON} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 transition-colors flex items-center gap-2 text-sm">
                                                    <span>🔧</span> JSON
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Clear Board - Admin Only */}
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Are you sure you want to clear all notes from the board? This action cannot be undone.")) {
                                                clearAllNotes();
                                            }
                                        }}
                                        className="flex items-center gap-2 h-[46px] bg-red-50 hover:bg-red-100 text-red-600 px-3 rounded-xl transition-all shadow-sm hover:shadow text-sm font-medium whitespace-nowrap border border-red-100"
                                        title="Clear all notes"
                                    >
                                        <Trash2 size={16} />
                                        <span className="hidden lg:inline">Clear Board</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Board Container */}
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Board Grid - Columns */}
                    <div
                        ref={boardRef}
                        className={`flex-1 flex gap-6 overflow-x-auto pb-4 ${sortedColumns.length <= 4 ? '' : ''}`}
                    >
                        {sortedColumns.map(column => (
                            <div
                                key={column.id}
                                className={
                                    isAdmin
                                        ? (sortedColumns.length <= 3 ? 'flex-1 min-w-[250px]' : 'flex-shrink-0 w-72')
                                        : (sortedColumns.length <= 4 ? 'flex-1 min-w-[250px]' : 'flex-shrink-0 w-80')
                                }
                            >
                                <Column
                                    column={column}
                                    notes={getNotesByColumn(column.id)}
                                    onAddNote={handleAddNote}
                                    onUpdateNote={updateNote}
                                    onDeleteNote={deleteNote}
                                    onVoteNote={voteNote}
                                    onReactNote={reactNote}
                                    onMoveNote={moveNote}
                                    onUpdateColumn={updateColumn}
                                    onDeleteColumn={deleteColumn}
                                    currentUser={currentUser}
                                    currentUserId={localStorage.getItem('crisp_user_id')}
                                    isAdmin={isAdmin}
                                    searchQuery={searchQuery}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Add Column Button - Admin Only (Right side) */}
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddColumnModal(true)}
                            className="flex-shrink-0 w-14 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 transition-all group cursor-pointer"
                            title="Add Column"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-200 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                                <Plus size={20} className="text-gray-500 group-hover:text-blue-600" />
                            </div>
                        </button>
                    )}
                </div>

                {/* Add Column Modal */}
                {showAddColumnModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddColumnModal(false)}>
                        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800">Add New Column</h3>
                                <button
                                    onClick={() => setShowAddColumnModal(false)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Column Title</label>
                                <input
                                    type="text"
                                    value={newColumnTitle}
                                    onChange={(e) => setNewColumnTitle(e.target.value)}
                                    placeholder="e.g., Action Items"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddColumn();
                                    }}
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {COLUMN_COLORS.map((colorOption) => (
                                        <button
                                            key={colorOption.id}
                                            onClick={() => setSelectedColor(colorOption)}
                                            className={`w-10 h-10 rounded-lg ${colorOption.color} border-2 transition-all ${selectedColor.id === colorOption.id
                                                ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                                                : 'hover:scale-105'
                                                }`}
                                            title={colorOption.id}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAddColumnModal(false)}
                                    className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddColumn}
                                    disabled={!newColumnTitle.trim()}
                                    className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                                >
                                    Add Column
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default BoardPage;
