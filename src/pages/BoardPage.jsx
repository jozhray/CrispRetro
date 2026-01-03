import React, { useState, useRef, useEffect, useMemo, isValidElement, cloneElement } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls, LayoutGroup } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Download, Share2, ArrowLeft, Wifi, WifiOff, ChevronDown, Plus, X, Trash2, Menu, MoreVertical, Users, Clock, Music, Trophy, Sparkles } from 'lucide-react';
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
import { userService } from '../services/userService';

import BoardAudioManager from '../components/Board/BoardAudioManager';
import AnimatedBackground from '../components/AnimatedBackground';

const DraggableColumn = ({ column, isMobileAndHidden, className, children, onDragStart, onDragEnd }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={column}
            id={column.id}
            dragListener={false}
            dragControls={dragControls}
            className={className}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {isValidElement(children) && typeof children.type !== 'string'
                ? cloneElement(children, { dragControls, onDragStart, onDragEnd })
                : children}
        </Reorder.Item>
    );
};

const BoardPage = () => {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showUserList, setShowUserList] = useState(false);
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLUMN_COLORS[4]); // Default blue
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [hasCheckedAge, setHasCheckedAge] = useState(false);
    const lastCreatedAtRef = useRef(null);
    const [templateName, setTemplateName] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [hasColumnChanges, setHasColumnChanges] = useState(false);
    const boardRef = useRef(null);
    const exportMenuRef = useRef(null);
    const userListRef = useRef(null);
    const currentUser = localStorage.getItem('crisp_user_name') || 'Anonymous';
    const toast = useToast();

    // Global Audio State
    const [musicVolume, setMusicVolume] = useState(() => parseFloat(localStorage.getItem('crisp_music_vol') || '0.5'));
    const [timerVolume, setTimerVolume] = useState(() => parseFloat(localStorage.getItem('crisp_timer_vol') || '0.5'));
    const [audioBlocked, setAudioBlocked] = useState(false);
    const audioManagerRef = useRef(null);

    // Persist Volumes
    useEffect(() => { localStorage.setItem('crisp_music_vol', musicVolume); }, [musicVolume]);
    useEffect(() => { localStorage.setItem('crisp_timer_vol', timerVolume); }, [timerVolume]);

    // Resume Audio Handler
    const handleResumeAudio = () => {
        if (audioManagerRef.current) {
            audioManagerRef.current.resumeAudio();
        }
    };

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
        updateNoteColor,
        deleteNote,
        voteNote,
        reactNote,
        addComment,
        updateComment,
        deleteComment,
        moveNote,
        getNotesByColumn,
        updateBoardName,
        updateTimer,
        updateMusic,
        createPoll,
        votePoll,
        closePoll,
        deletePoll,
        clearAllNotes,
        moveColumn,
        reorderNotes,
        allMembers,
        createdAt,
        resetBoard,
        hasLoaded
    } = useBoard(boardId);

    // Prevent accidental navigation
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isAdmin) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isAdmin]);

    // Check if board is old and prompt for reset (Admin only)
    useEffect(() => {
        // We wait for data to be loaded AND firebase to be ready
        if (hasLoaded && isFirebaseReady && isAdmin && !hasCheckedAge) {
            const tenSecondsMs = 10 * 1000;

            // If createdAt is missing (null/undefined), it's a board from before this feature, 
            // so we treat it as old to give the admin a chance to reset it.
            // BUT we only do this if it's NOT a board that was just created (which would have been cached locally with a timestamp)
            const isOld = !createdAt || (Date.now() - createdAt > tenSecondsMs);

            if (isOld) {
                setShowResetModal(true);
            }
            setHasCheckedAge(true);
        }
    }, [hasLoaded, isFirebaseReady, isAdmin, createdAt, hasCheckedAge]);

    // Detect if board was reset by admin (for regular users)
    useEffect(() => {
        if (createdAt && lastCreatedAtRef.current && createdAt > lastCreatedAtRef.current) {
            if (!isAdmin) {
                toast.info("Admin reset the board so you will get new board to intact the team.", {
                    duration: 6000,
                    icon: <Sparkles className="text-blue-500" size={18} />
                });
            }
        }
        if (createdAt) {
            lastCreatedAtRef.current = createdAt;
        }
    }, [createdAt, isAdmin, toast]);

    // Update board history timestamp when entering
    useEffect(() => {
        const userEmail = localStorage.getItem('crisp_user_email');
        if (userEmail && isFirebaseReady && boardName) {
            userService.updateBoardHistoryTimestamp(userEmail, boardId, { name: boardName });
        }
    }, [boardId, boardName, isFirebaseReady]);

    // Compute offline users
    const offlineUsers = useMemo(() => {
        if (!allMembers) return [];
        const onlineIds = new Set(onlineUsers.map(u => u.id));
        return Object.values(allMembers)
            .filter(m => !onlineIds.has(m.id))
            .sort((a, b) => b.lastSeen - a.lastSeen);
    }, [allMembers, onlineUsers]);

    // Mobile Column Selection State
    const [selectedMobileColumnId, setSelectedMobileColumnId] = useState(() => {
        return localStorage.getItem(`crisp_mobile_col_${boardId}`) || null;
    });

    // Initialize selected mobile column once columns are loaded
    useEffect(() => {
        if (sortedColumns.length > 0) {
            // If we have a selected column, verify it still exists
            const isValidSelection = selectedMobileColumnId && sortedColumns.some(c => c.id === selectedMobileColumnId);

            if (!isValidSelection) {
                // Default to first column if no selection or invalid
                setSelectedMobileColumnId(sortedColumns[0].id);
            }
        }
    }, [sortedColumns, selectedMobileColumnId]);

    // Persist selection
    useEffect(() => {
        if (selectedMobileColumnId) {
            localStorage.setItem(`crisp_mobile_col_${boardId}`, selectedMobileColumnId);
        }
    }, [selectedMobileColumnId, boardId]);

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

    const handleSaveAsTemplate = async () => {
        if (!templateName.trim()) {
            toast.warning('Please enter a template name');
            return;
        }

        setIsSavingTemplate(true);
        try {
            const userEmail = localStorage.getItem('crisp_user_email');
            if (!userEmail) {
                toast.error('You must be logged in to save templates');
                return;
            }

            await userService.saveTemplate(userEmail, {
                name: templateName.trim(),
                columns: sortedColumns.map((col, idx) => ({
                    id: `col-${idx}`,
                    title: col.title,
                    color: col.color,
                    titleColor: col.titleColor,
                    order: idx
                }))
            });

            toast.success('Template saved successfully!');
            setShowSaveTemplateModal(false);
            setTemplateName('');
            setHasColumnChanges(false);
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error('Failed to save template');
        } finally {
            setIsSavingTemplate(false);
        }
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
        setHasColumnChanges(true);
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

        sortedColumns.forEach(column => {
            // Get notes for this column directly from notes object
            const columnNotes = Object.values(notes)
                .filter(note => note.columnId === column.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

            columnNotes.forEach(note => {
                exportData.push({
                    'Column': column.title,
                    'Note Content': note.content || '',
                    'Author': note.author || 'Anonymous',
                    'Votes': note.votes || 0,
                    'Created At': note.createdAt ? new Date(note.createdAt).toLocaleString() : 'N/A',
                    'Comments': note.comments ? Object.values(note.comments).map(c => `${c.author}: ${c.content}`).join('\n') : ''
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

            // Sheet 1: Board Summary
            const summaryData = [
                ['Board Name', boardName || 'N/A'],
                ['Board ID', boardId],
                ['Export Date', new Date().toLocaleString()],
                ['Total Notes', exportData.length],
                ['Total Members', allMembers ? Object.keys(allMembers).length : 0]
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 20 }, { wch: 50 }];

            // Sheet 2: Notes
            const wsNotes = XLSX.utils.json_to_sheet(exportData);
            wsNotes['!cols'] = [
                { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 40 }
            ];

            // Sheet 3: Team Members
            const memberData = allMembers ? Object.values(allMembers)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(m => ({
                    'Name': m.name || 'Anonymous',
                    'Join Time': m.joinedAt ? new Date(m.joinedAt).toLocaleString() : 'N/A',
                    'Last Seen': m.lastSeen ? new Date(m.lastSeen).toLocaleString() : 'N/A',
                    'Status': onlineUsers.some(u => u.id === m.id) ? 'Online' : 'Offline'
                })) : [];

            const wsMembers = XLSX.utils.json_to_sheet(memberData);
            wsMembers['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 15 }];
            wsMembers['!rows'] = [{ hpt: 25 }]; // Add some height to header

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
            XLSX.utils.book_append_sheet(wb, wsNotes, "Notes");
            XLSX.utils.book_append_sheet(wb, wsMembers, "Team Members");

            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
            const nameToUse = boardName || 'Retro-Board';
            const safeName = nameToUse.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
            XLSX.writeFile(wb, `${safeName}_${timestamp}.xlsx`);
            setShowExportMenu(false);
            toast.success('Exported to Excel with 3 sheets!');
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

            const headers = ['Column', 'Note Content', 'Author', 'Votes', 'Created At', 'Comments'];
            const csvRows = [headers.join(',')];

            exportData.forEach(row => {
                const values = [
                    `"${row['Column']}"`,
                    `"${row['Note Content'].replace(/"/g, '""')}"`,
                    `"${row['Author']}"`,
                    row['Votes'],
                    `"${row['Created At']}"`,
                    `"${row['Comments'].replace(/"/g, '""')}"`
                ];
                csvRows.push(values.join(','));
            });

            // Add Team Members Section with clear delimiter
            if (allMembers && Object.keys(allMembers).length > 0) {
                csvRows.push('\n');
                csvRows.push('-------------------------------------------');
                csvRows.push('JOINED TEAM MEMBERS');
                csvRows.push('-------------------------------------------');
                csvRows.push('Name,Join Time,Last Seen,Status');
                Object.values(allMembers)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .forEach(m => {
                        const status = onlineUsers.some(u => u.id === m.id) ? 'Online' : 'Offline';
                        csvRows.push(`"${m.name}","${new Date(m.joinedAt).toLocaleString()}","${new Date(m.lastSeen).toLocaleString()}","${status}"`);
                    });
            }

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
            toast.success('Exported to CSV with Team Members!');
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

            // Branded Header (Similar to App Header)
            doc.setFontSize(24);
            doc.setTextColor(41, 128, 185); // Blue theme
            doc.text("CrispRetro", 14, 22);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Report for: ${boardName}`, 14, 30);
            doc.text(`Exported by: ${currentUser}`, 14, 35);
            doc.text(`Date: ${new Date().toLocaleString()}`, 14, 40);

            // Divider line
            doc.setDrawColor(200);
            doc.line(14, 45, 196, 45);

            let lastY = 55;

            // Group notes by column for better display
            sortedColumns.forEach(column => {
                const columnNotes = Object.values(notes)
                    .filter(note => note.columnId === column.id)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                // Always show column title, even if empty
                // Column Title
                doc.setFontSize(14);
                doc.setTextColor(0);
                // Check if we need a new page for the title
                if (lastY > 250) {
                    doc.addPage();
                    lastY = 20;
                }
                doc.text(column.title, 14, lastY);
                lastY += 8; // Spacing after title

                if (columnNotes.length > 0) {
                    // Table
                    const tableData = columnNotes.map(note => [
                        note.content || '',
                        note.author || 'Anonymous',
                        (note.votes || 0).toString(),
                        note.comments ? Object.values(note.comments).map(c => `${c.author}: ${c.content}`).join('\n') : ''
                    ]);

                    autoTable(doc, {
                        startY: lastY,
                        head: [['Note', 'Author', 'Votes', 'Comments']],
                        body: tableData,
                        theme: 'striped',
                        headStyles: { fillColor: [66, 66, 66] },
                        styles: { fontSize: 10, cellPadding: 3 },
                        columnStyles: {
                            0: { cellWidth: 'auto' },
                            1: { cellWidth: 30 },
                            2: { cellWidth: 15, halign: 'center' },
                            3: { cellWidth: 50 }
                        },
                        margin: { top: 20 },
                        didDrawPage: (data) => {
                            // Optional: Header on new pages could go here
                        }
                    });

                    lastY = doc.lastAutoTable.finalY + 15;
                } else {
                    // Empty state message
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text("(No notes in this column)", 14, lastY);
                    lastY += 15;
                }
            });

            // Add Team Members Page
            if (allMembers && Object.keys(allMembers).length > 0) {
                doc.addPage();
                doc.setFontSize(16);
                doc.setTextColor(41, 128, 185);
                doc.text("Joined Team Members", 14, 20);

                // Reset text color for table
                doc.setTextColor(0);

                const memberData = Object.values(allMembers)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(m => [
                        m.name || 'Anonymous',
                        m.joinedAt ? new Date(m.joinedAt).toLocaleString() : 'N/A',
                        m.lastSeen ? new Date(m.lastSeen).toLocaleString() : 'N/A',
                        onlineUsers.some(u => u.id === m.id) ? 'Online' : 'Offline'
                    ]);

                autoTable(doc, {
                    startY: 25,
                    head: [['Name', 'Join Time', 'Last Seen', 'Status']],
                    body: memberData,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185] }, // Match board theme blue
                    styles: { fontSize: 10, cellPadding: 3 }
                });

                // Add total member count
                const totalMembers = Object.keys(allMembers).length;
                doc.setFontSize(11);
                doc.setTextColor(60, 60, 60);
                doc.text(`Total Members: ${totalMembers}`, 14, doc.lastAutoTable.finalY + 10);
            }

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
                columns: sortedColumns.map(column => ({
                    id: column.id,
                    title: column.title,
                    color: column.color,
                    notes: Object.values(notes).filter(n => n.columnId === column.id)
                })),
                teamMembers: allMembers ? Object.values(allMembers).map(m => ({
                    name: m.name,
                    joinedAt: m.joinedAt,
                    lastSeen: m.lastSeen,
                    isOnline: onlineUsers.some(u => u.id === m.id)
                })) : []
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

    const handleClearBoard = () => {
        if (!notes || Object.keys(notes).length === 0) {
            toast.warning("The board is already empty!");
            return;
        }

        if (window.confirm("Are you sure you want to clear all notes? This action cannot be undone.")) {
            clearAllNotes();
        }
    };

    return (
        <>
            <AnimatedBackground />
            <Layout>
                {/* ... global components ... */}
                <Poll
                    polls={polls}
                    activePoll={activePoll}
                    isAdmin={isAdmin}
                    onCreatePoll={createPoll}
                    onVotePoll={votePoll}
                    onClosePoll={closePoll}
                    onDeletePoll={deletePoll}
                    currentUserId={localStorage.getItem('crisp_user_id')}
                    showControls={false}
                />

                {isAdmin && (
                    <BoardAudioManager
                        ref={audioManagerRef}
                        music={music}
                        timer={timer}
                        musicVolume={musicVolume}
                        timerVolume={timerVolume}
                        onUpdateTimer={updateTimer}
                        onUpdateMusic={updateMusic}
                        onAudioBlocked={setAudioBlocked}
                        isAdmin={isAdmin}
                    />
                )}


                {/* Onboarding Tour - Different steps for admin vs user */}
                <Tour
                    steps={isAdmin ? BOARD_TOUR_STEPS_ADMIN : BOARD_TOUR_STEPS_USER}
                    storageKey={isAdmin ? 'crisp_board_admin_tour_completed' : 'crisp_board_user_tour_completed'}
                />

                <div className={`relative z-10 flex flex-col h-[calc(100vh-4rem)] ${isDragging ? 'select-none' : ''}`}>

                    {/* === MOBILE HEADER (Single Line) === */}
                    <div className="md:hidden flex items-center justify-between p-3 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {isAdmin && (
                                <button
                                    onClick={() => setShowExitConfirm(true)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <h1 className="text-xl font-bold text-gray-800 truncate">{boardName}</h1>
                            <div className={`w-2 h-2 rounded-full ${isFirebaseReady ? 'bg-green-500' : 'bg-orange-500'} shadow-sm`} title={isFirebaseReady ? "Live" : "Local Mode"}></div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Poll
                                id="poll-btn"
                                polls={polls}
                                activePoll={activePoll}
                                isAdmin={isAdmin}
                                onCreatePoll={createPoll}
                                onVotePoll={votePoll}
                                onClosePoll={closePoll}
                                onDeletePoll={deletePoll}
                                currentUserId={localStorage.getItem('crisp_user_id')}
                                showActivePoll={false}
                            />
                            <button
                                onClick={() => setShowMobileMenu(true)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                            >
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>

                    {/* === MOBILE MENU OVERLAY === */}
                    <div
                        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                        onClick={() => setShowMobileMenu(false)}
                    >
                        <div
                            className={`absolute right-0 top-0 bottom-0 w-3/4 max-w-xs bg-white shadow-2xl p-4 flex flex-col gap-6 transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : 'translate-x-full'
                                }`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                <h2 className="font-bold text-gray-800 text-lg">Board Menu</h2>
                                <button onClick={() => setShowMobileMenu(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                            </div>

                            <div className="flex flex-col gap-4 overflow-y-auto">
                                {/* Session Controls */}
                                <div className="space-y-3">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Session Controls</div>
                                    <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <Timer
                                            timer={timer}
                                            isAdmin={isAdmin}
                                            onUpdateTimer={updateTimer}
                                            volume={timerVolume}
                                            onVolumeChange={setTimerVolume}
                                            audioBlocked={audioBlocked}
                                            onResumeAudio={handleResumeAudio}
                                        />
                                        {isAdmin && (
                                            <>
                                                <div className="h-px bg-gray-200"></div>
                                                <MusicPlayer
                                                    music={music}
                                                    isAdmin={isAdmin}
                                                    onUpdateMusic={updateMusic}
                                                    volume={musicVolume}
                                                    onVolumeChange={setMusicVolume}
                                                    audioBlocked={audioBlocked}
                                                    onResumeAudio={handleResumeAudio}
                                                />
                                            </>
                                        )}

                                    </div>
                                </div>

                                {/* Utilities */}
                                <div className="space-y-3">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</div>
                                    <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                                        <Search size={16} className="text-gray-400 mr-2" />
                                        <input
                                            type="text"
                                            placeholder="Search notes..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-transparent outline-none flex-1 text-sm"
                                        />
                                    </div>
                                    <button onClick={handleShare} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left text-gray-700">
                                        <Share2 size={18} />
                                        <span>Invite Others</span>
                                    </button>
                                    <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                        <button
                                            onClick={() => setShowUserList(!showUserList)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors text-left text-gray-700"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Users size={18} />
                                                <span>Active Users ({onlineUsers.length})</span>
                                            </div>
                                            <ChevronDown size={16} className={`transition-transform ${showUserList ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showUserList && (
                                            <div className="px-3 pb-3 pt-0 bg-gray-50 max-h-40 overflow-y-auto">
                                                <div className="h-px bg-gray-200 mb-2"></div>
                                                {onlineUsers.length === 0 ? (
                                                    <p className="text-sm text-gray-400 italic">No one else is here...</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {onlineUsers.map(user => (
                                                            <div key={user.id} className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                                                    {user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-sm text-gray-600 truncate">{user.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Admin Actions */}
                                {isAdmin && (
                                    <div className="space-y-3">
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</div>
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                            <button onClick={handleExportExcel} className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 text-left text-gray-700 transition-colors border-b border-gray-100">
                                                <span>📊</span> Export Excel
                                            </button>
                                            <button onClick={handleExportPDF} className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 text-left text-gray-700 transition-colors border-b border-gray-100">
                                                <span>📑</span> Export PDF
                                            </button>
                                            <button
                                                onClick={handleClearBoard}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-red-50 text-left text-red-600 transition-colors border-b border-gray-100"
                                            >
                                                <Trash2 size={18} /> Clear Board
                                            </button>
                                            {hasColumnChanges && (
                                                <button
                                                    onClick={() => {
                                                        setTemplateName(boardName + " Template");
                                                        setShowSaveTemplateModal(true);
                                                        setShowMobileMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-cyan-50 text-left text-cyan-600 transition-colors"
                                                >
                                                    <Sparkles size={18} /> Save as Template
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>



                    {/* === DESKTOP HEADER (Hidden on Mobile) === */}
                    <div className="hidden md:flex flex-col gap-1 mb-1">
                        {/* Top Row: Title & Main Info */}
                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowExitConfirm(true)}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex-shrink-0"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                )}

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

                            {/* Save Template Button - Visible only to admins and after changes */}
                            {isAdmin && hasColumnChanges && (
                                <div className="hidden lg:flex items-center gap-2 mr-4">
                                    <button
                                        id="save-template-btn"
                                        onClick={() => {
                                            setTemplateName(boardName + " Template");
                                            setShowSaveTemplateModal(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full text-xs font-bold transition-all shadow-sm hover:shadow-md animate-in fade-in slide-in-from-top-1 duration-500"
                                    >
                                        <Sparkles size={14} />
                                        <span>Save Template</span>
                                    </button>
                                </div>
                            )}

                            {/* Online Users - Right Side */}
                            {onlineUsers.length > 0 && (
                                <div className="relative flex items-center gap-2 flex-shrink-0 justify-end z-[60]" ref={userListRef}>
                                    <button
                                        onClick={() => setShowUserList(!showUserList)}
                                        className="flex items-center gap-2 p-1 hover:bg-white/40 rounded-full transition-colors outline-none focus:ring-2 focus:ring-blue-300 group"
                                        title="Show all online users"
                                    >
                                        <span className="text-xs font-medium text-gray-500 hidden lg:inline mr-1 group-hover:text-gray-700">
                                            {onlineUsers.length} online {offlineUsers.length > 0 && `• ${offlineUsers.length} offline`}
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
                                    {/* User List Dropdown (same as before) */}
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
                                                            <div className="text-sm font-medium text-gray-800 truncate">
                                                                {user.name} {user.id === localStorage.getItem('crisp_user_id') && <span className="text-blue-500 font-bold">(You)</span>}
                                                            </div>
                                                            <div className="text-[10px] text-green-600 font-medium">Online</div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {offlineUsers.length > 0 && (
                                                    <>
                                                        <div className="mt-2 mb-1 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Offline</div>
                                                        {offlineUsers.map(user => (
                                                            <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors opacity-70">
                                                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                                                    {user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-medium text-gray-600 truncate">{user.name}</div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        Last seen: {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Unified Toolbar - Precision Balanced (Auto-wraps elegantly at high zoom) */}
                        <div className="flex flex-row flex-wrap lg:flex-nowrap items-center justify-between gap-1 lg:gap-2 bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm relative z-50">
                            {/* 1. Session Controls Group (Fixed) */}
                            <div className="flex flex-nowrap items-center justify-start gap-1 shrink-0" id="audio-controls">
                                <div className="flex items-center gap-0.5 bg-gray-100/50 p-0.5 rounded-xl border border-gray-200/50">
                                    <Timer
                                        timer={timer}
                                        isAdmin={isAdmin}
                                        onUpdateTimer={updateTimer}
                                        volume={timerVolume}
                                        onVolumeChange={setTimerVolume}
                                        audioBlocked={audioBlocked}
                                        onResumeAudio={handleResumeAudio}
                                    />
                                    {isAdmin && (
                                        <>
                                            <MusicPlayer
                                                music={music}
                                                isAdmin={isAdmin}
                                                onUpdateMusic={updateMusic}
                                                volume={musicVolume}
                                                onVolumeChange={setMusicVolume}
                                                audioBlocked={audioBlocked}
                                                onResumeAudio={handleResumeAudio}
                                            />
                                        </>
                                    )}
                                    {!isAdmin && <div className="hidden"></div>}
                                    <Poll
                                        id="poll-btn-desktop"
                                        polls={polls}
                                        activePoll={activePoll}
                                        isAdmin={isAdmin}
                                        onCreatePoll={createPoll}
                                        onVotePoll={votePoll}
                                        onClosePoll={closePoll}
                                        onDeletePoll={deletePoll}
                                        currentUserId={localStorage.getItem('crisp_user_id')}
                                        showActivePoll={false}
                                    />
                                </div>
                            </div>

                            {/* 2. Search Box (Trigger Element - Forces wrap at high zoom) */}
                            <div className="relative flex-grow min-w-[150px] max-w-[180px] mx-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 h-8 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full transition-all shadow-sm"
                                />
                            </div>

                            {/* 3. Action Buttons Group (Fixed) */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    id="share-board-btn"
                                    onClick={handleShare}
                                    className="flex items-center gap-2 h-8 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 rounded-xl border border-transparent transition-all shadow-sm hover:shadow text-sm font-medium whitespace-nowrap"
                                >
                                    <Share2 size={16} />
                                    <span className="hidden sm:inline">Invite</span>
                                </button>

                                {/* Export - Admin Only */}
                                {isAdmin && (
                                    <div className="relative" ref={exportMenuRef}>
                                        <button
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            className="flex items-center gap-2 h-8 bg-gray-900 hover:bg-black text-white px-3 rounded-xl transition-all shadow-sm hover:shadow text-sm font-medium whitespace-nowrap"
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
                                        onClick={handleClearBoard}
                                        className="flex items-center gap-2 h-[42px] bg-red-50 hover:bg-red-100 text-red-600 px-3 rounded-xl transition-all shadow-sm hover:shadow text-sm font-medium whitespace-nowrap border border-red-100"
                                        title="Clear all notes"
                                    >
                                        <Trash2 size={16} />
                                        <span className="hidden lg:inline">Clear Board</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Column Selector (Visible only on mobile) */}
                    <div className="md:hidden px-2 mb-2">
                        <div className="relative">
                            <select
                                value={selectedMobileColumnId || ''}
                                onChange={(e) => setSelectedMobileColumnId(e.target.value)}
                                className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-blue-500 shadow-sm font-semibold"
                            >
                                {sortedColumns.map(column => (
                                    <option key={column.id} value={column.id}>
                                        {column.title}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                                <ChevronDown size={20} />
                            </div>
                        </div>
                    </div>

                    {/* Board Container */}
                    <div className="flex-1 flex gap-4 overflow-hidden h-full">
                        {/* Board Grid - Columns */}
                        <LayoutGroup>
                            <Reorder.Group
                                axis="x"
                                values={sortedColumns}
                                onReorder={(newOrder) => {
                                    if (isAdmin) {
                                        moveColumn(newOrder.map(c => c.id));
                                        setHasColumnChanges(true);
                                    }
                                }}
                                ref={boardRef}
                                className="flex-1 flex gap-4 md:gap-6 overflow-y-hidden md:overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none"
                            >
                                {sortedColumns.map(column => {
                                    // On mobile, completely unmount non-selected columns to prevent layout/scroll glitches
                                    // On desktop, render all columns as usual
                                    const isMobileAndHidden = selectedMobileColumnId && column.id !== selectedMobileColumnId;

                                    return (
                                        <DraggableColumn
                                            key={column.id}
                                            column={column}
                                            isMobileAndHidden={isMobileAndHidden}
                                            onDragStart={() => setIsDragging(true)}
                                            onDragEnd={() => setIsDragging(false)}
                                            className={`
                                        snap-center shrink-0 h-full
                                        ${isMobileAndHidden ? 'hidden md:block' : 'block w-full'} 
                                        md:w-[45vw] lg:flex-1 lg:min-w-[300px] xl:max-w-md
                                    `}
                                        >
                                            {(!isMobileAndHidden || window.innerWidth >= 768) ? (
                                                <Column
                                                    column={column}
                                                    notes={getNotesByColumn(column.id)}
                                                    onAddNote={handleAddNote}
                                                    onUpdateNote={updateNote}
                                                    onUpdateNoteColor={updateNoteColor}
                                                    onDeleteNote={deleteNote}
                                                    onVoteNote={voteNote}
                                                    onReactNote={reactNote}
                                                    onMoveNote={moveNote}
                                                    onAddComment={addComment}
                                                    onUpdateComment={updateComment}
                                                    onDeleteComment={deleteComment}
                                                    onReorderNotes={reorderNotes}
                                                    onUpdateColumn={(id, updates) => {
                                                        updateColumn(id, updates);
                                                        setHasColumnChanges(true);
                                                    }}
                                                    onDeleteColumn={(id) => {
                                                        deleteColumn(id);
                                                        setHasColumnChanges(true);
                                                    }}
                                                    currentUser={currentUser}
                                                    currentUserId={localStorage.getItem('crisp_user_id')}
                                                    isAdmin={isAdmin}
                                                    searchQuery={searchQuery}
                                                    hideTitleOnMobile={true}
                                                />
                                            ) : <div />}
                                        </DraggableColumn>
                                    );
                                })}
                            </Reorder.Group>
                        </LayoutGroup>

                        {/* Add Column Button - Admin Only (Right side - Desktop Only) */}
                        {isAdmin && (
                            <button
                                onClick={() => setShowAddColumnModal(true)}
                                className="hidden md:flex flex-shrink-0 w-14 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 transition-all group cursor-pointer"
                                title="Add Column"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-200 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                                    <Plus size={20} className="text-gray-500 group-hover:text-blue-600" />
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Add Column FAB - Mobile Only */}
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddColumnModal(true)}
                            className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            <Plus size={24} />
                        </button>
                    )}

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
                                                className={`w-10 h-10 rounded-lg ${colorOption.previewColor} border-2 border-white/20 transition-all ${selectedColor.id === colorOption.id
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
            {/* Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowExitConfirm(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-gray-100"
                        >
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <ArrowLeft className="text-amber-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Leave Board?</h2>
                            <p className="text-gray-500 text-center mb-8">
                                Are you sure you want to leave? Your board session will still be active, but you'll return to the dashboard.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                                >
                                    Yes, Leave Board
                                </button>
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-bold transition-all active:scale-[0.98]"
                                >
                                    Stay on Board
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Save Template Modal */}
            <AnimatePresence>
                {showSaveTemplateModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSavingTemplate && setShowSaveTemplateModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-gray-100"
                        >
                            <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <Sparkles className="text-cyan-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Save as Template</h2>
                            <p className="text-gray-500 text-center mb-6">
                                Enter a name for this template to reuse these columns in future boards.
                            </p>

                            <div className="mb-6">
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Template Name"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                                    autoFocus
                                    disabled={isSavingTemplate}
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleSaveAsTemplate}
                                    disabled={isSavingTemplate || !templateName.trim()}
                                    className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isSavingTemplate ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Template</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowSaveTemplateModal(false)}
                                    disabled={isSavingTemplate}
                                    className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-bold transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Board Reset Prompt Modal */}
            <AnimatePresence>
                {showResetModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowResetModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-gray-100"
                        >
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <Clock className="text-amber-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Reuse this board?</h2>
                            <p className="text-gray-500 text-center mb-8">
                                This board is more than a day old. Use it again with a fresh start or keep existing history?
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        resetBoard(false);
                                        setShowResetModal(false);
                                    }}
                                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={18} />
                                    Without History (Reset)
                                </button>
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Clock size={18} />
                                    With History (Keep)
                                </button>
                            </div>
                            <p className="mt-4 text-[10px] text-center text-gray-400">
                                Note: "Without History" will clear all notes and reset the member list for today's tracking.
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default BoardPage;
