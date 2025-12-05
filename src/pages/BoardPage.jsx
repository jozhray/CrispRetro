import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Download, Share2, ArrowLeft, Wifi, WifiOff, ChevronDown, Plus, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
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
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLUMN_COLORS[4]); // Default blue
    const boardRef = useRef(null);
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
        deletePoll
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
            const safeName = boardName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
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
            const safeName = boardName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
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

            doc.setFontSize(18);
            doc.text(boardName, 20, 20);

            doc.setFontSize(10);
            doc.text(`Board ID: ${boardId}`, 20, 28);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 34);

            let yPos = 45;
            doc.setFontSize(12);

            Object.values(columns).forEach(column => {
                const columnNotes = getNotesByColumn(column.id);
                if (columnNotes.length > 0) {
                    doc.setFont(undefined, 'bold');
                    doc.text(column.title, 20, yPos);
                    yPos += 7;
                    doc.setFont(undefined, 'normal');

                    columnNotes.forEach(note => {
                        const lines = doc.splitTextToSize(note.content || '(empty)', 170);
                        lines.forEach(line => {
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(`• ${line}`, 25, yPos);
                            yPos += 5;
                        });
                        doc.setFontSize(9);
                        doc.text(`  Author: ${note.author} | Votes: ${note.votes || 0}`, 25, yPos);
                        yPos += 7;
                        doc.setFontSize(12);
                    });
                    yPos += 3;
                }
            });

            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
            const safeName = boardName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
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
            const safeName = boardName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
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
            {/* Onboarding Tour - Different steps for admin vs user */}
            <Tour
                steps={isAdmin ? BOARD_TOUR_STEPS_ADMIN : BOARD_TOUR_STEPS_USER}
                storageKey={isAdmin ? 'crisp_board_admin_tour_completed' : 'crisp_board_user_tour_completed'}
            />

            <div className="flex flex-col h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={boardName}
                                    onChange={(e) => isAdmin && updateBoardName(e.target.value)}
                                    readOnly={!isAdmin}
                                    className={`text-2xl font-bold text-gray-800 bg-transparent border border-transparent rounded px-1 -ml-1 outline-none w-full max-w-md transition-all ${isAdmin ? 'hover:border-gray-200 focus:border-blue-300' : 'cursor-default'}`}
                                />
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isFirebaseReady ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {isFirebaseReady ? <Wifi size={12} /> : <WifiOff size={12} />}
                                    <span>{isFirebaseReady ? 'Live' : 'Local Mode'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Board ID:</span>
                                <button
                                    onClick={copyBoardId}
                                    className="font-mono bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                    title="Click to copy ID"
                                >
                                    {boardId}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Timer timer={timer} isAdmin={isAdmin} onUpdateTimer={updateTimer} music={music} onUpdateMusic={updateMusic} />
                        <MusicPlayer music={music} isAdmin={isAdmin} onUpdateMusic={updateMusic} />
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

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full md:w-64"
                            />
                        </div>

                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-200 transition-all shadow-sm hover:shadow-md"
                        >
                            <Share2 size={18} />
                            <span className="hidden sm:inline font-medium">Invite</span>
                        </button>

                        {/* Export Dropdown Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                <Download size={18} />
                                <span className="hidden sm:inline">Export</span>
                                <ChevronDown size={16} />
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                    <button
                                        onClick={handleExportExcel}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <span>📊</span> Export as Excel
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <span>📄</span> Export as CSV
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <span>📑</span> Export as PDF
                                    </button>
                                    <button
                                        onClick={handleExportJSON}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <span>🔧</span> Export as JSON
                                    </button>
                                </div>
                            )}
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
                                className={sortedColumns.length <= 4 ? 'flex-1 min-w-[250px]' : 'flex-shrink-0 w-80'}
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
