import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Download, Share2, ArrowLeft, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import Layout from '../components/Layout';
import Column from '../components/Board/Column';
import Timer from '../components/Board/Timer';
import MusicPlayer from '../components/Board/MusicPlayer';
import { useBoard } from '../store/useBoard';

const BoardPage = () => {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const boardRef = useRef(null);
    const currentUser = localStorage.getItem('crisp_user_name') || 'Anonymous';

    const {
        columns,
        notes,
        boardName,
        isFirebaseReady,
        isAdmin,
        timer,
        music,
        addNote,
        updateNote,
        deleteNote,
        voteNote,
        getNotesByColumn,
        updateBoardName,
        updateTimer,
        updateMusic
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

    const prepareExportData = () => {
        const exportData = [];
        Object.values(columns).forEach(column => {
            const columnNotes = getNotesByColumn(column.id);
            columnNotes.forEach(note => {
                exportData.push({
                    'Column': column.title,
                    'Note Content': note.content,
                    'Author': note.author,
                    'Votes': note.votes || 0,
                    'Created At': new Date(note.createdAt).toLocaleString()
                });
            });
        });
        return exportData;
    };

    const handleExportExcel = () => {
        try {
            const exportData = prepareExportData();
            if (exportData.length === 0) return alert('No notes to export!');

            const ws = XLSX.utils.json_to_sheet(exportData);
            const colWidths = [
                { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
            ];
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Retro Board");
            XLSX.writeFile(wb, `${boardName.replace(/\s+/g, '-').toLowerCase()}-${boardId}.xlsx`);
            setShowExportMenu(false);
        } catch (err) {
            console.error('Export failed', err);
            alert('Failed to export to Excel');
        }
    };

    const handleExportCSV = () => {
        try {
            const exportData = prepareExportData();
            if (exportData.length === 0) return alert('No notes to export!');

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
            a.download = `${boardName.replace(/\s+/g, '-').toLowerCase()}-${boardId}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            setShowExportMenu(false);
        } catch (err) {
            console.error('CSV export failed', err);
            alert('Failed to export to CSV');
        }
    };

    const handleExportPDF = () => {
        try {
            const exportData = prepareExportData();
            if (exportData.length === 0) return alert('No notes to export!');

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

            doc.save(`${boardName.replace(/\s+/g, '-').toLowerCase()}-${boardId}.pdf`);
            setShowExportMenu(false);
        } catch (err) {
            console.error('PDF export failed', err);
            alert('Failed to export to PDF');
        }
    };

    const handleExportJSON = () => {
        try {
            const exportData = {
                boardName,
                boardId,
                exportDate: new Date().toISOString(),
                columns: Object.values(columns).map(column => ({
                    id: column.id,
                    title: column.title,
                    color: column.color,
                    notes: getNotesByColumn(column.id)
                }))
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${boardName.replace(/\s+/g, '-').toLowerCase()}-${boardId}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
            setShowExportMenu(false);
        } catch (err) {
            console.error('JSON export failed', err);
            alert('Failed to export to JSON');
        }
    };

    const handleShare = () => {
        if (!isFirebaseReady) {
            alert('Warning: You are in Local Mode. Other users cannot see your changes until you configure Firebase.');
        }
        navigator.clipboard.writeText(window.location.href);
        alert('Board link copied to clipboard!');
    };

    const copyBoardId = () => {
        navigator.clipboard.writeText(boardId);
        alert('Board ID copied!');
    };

    return (
        <Layout>
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
                        <Timer timer={timer} isAdmin={isAdmin} onUpdateTimer={updateTimer} />
                        <MusicPlayer music={music} isAdmin={isAdmin} onUpdateMusic={updateMusic} />

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

                {/* Board Grid */}
                <div
                    ref={boardRef}
                    className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4"
                >
                    {Object.values(columns).map(column => (
                        <Column
                            key={column.id}
                            column={column}
                            notes={getNotesByColumn(column.id)}
                            onAddNote={handleAddNote}
                            onUpdateNote={updateNote}
                            onDeleteNote={deleteNote}
                            onVoteNote={voteNote}
                            currentUser={currentUser}
                            currentUserId={localStorage.getItem('crisp_user_id')}
                            isAdmin={isAdmin}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default BoardPage;
