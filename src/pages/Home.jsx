import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { database } from '../firebase';
import { ref, set } from 'firebase/database';

const Home = () => {
    const [name, setName] = useState(localStorage.getItem('crisp_user_name') || '');
    const [boardName, setBoardName] = useState('');
    const [boardId, setBoardId] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

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

    const handleCreateBoard = async () => {
        if (!name.trim()) return alert('Please enter your name first');
        if (!boardName.trim()) return alert('Please enter a board name');

        localStorage.setItem('crisp_user_name', name);
        const userId = localStorage.getItem('crisp_user_id');
        const newBoardId = crypto.randomUUID();

        const initialData = {
            name: boardName,
            adminId: userId, // Set creator as admin
            notes: {},
            timer: {
                isRunning: false,
                timeLeft: 0,
                lastUpdated: Date.now()
            },
            music: {
                isPlaying: false
            }
        };

        // Save to LocalStorage immediately
        localStorage.setItem(`crisp_board_${newBoardId}`, JSON.stringify(initialData));

        // Save to Firebase if available
        if (database) {
            try {
                await set(ref(database, `boards/${newBoardId}`), initialData);
            } catch (error) {
                console.error("Error creating board in Firebase:", error);
            }
        }

        navigate(`/board/${newBoardId}`);
    };

    const handleJoinBoard = (e) => {
        e.preventDefault();
        if (!name.trim()) return alert('Please enter your name first');
        if (!boardId.trim()) return;
        localStorage.setItem('crisp_user_name', name);
        navigate(`/board/${boardId}`);
    };

    return (
        <Layout>
            <div className="max-w-md mx-auto mt-20 text-center">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    CrispRetro
                </h1>
                <p className="text-gray-600 mb-8">Collaborative Retro Boards for your Team</p>

                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                    <div className="mb-6 text-left space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Board Name</label>
                            <input
                                type="text"
                                value={boardName}
                                onChange={(e) => setBoardName(e.target.value)}
                                placeholder="Sprint 42 Retro"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleCreateBoard}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus size={20} />
                            Create New Board
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or join existing</span>
                            </div>
                        </div>

                        <form onSubmit={handleJoinBoard} className="flex gap-2">
                            <input
                                type="text"
                                value={boardId}
                                onChange={(e) => setBoardId(e.target.value)}
                                placeholder="Enter Board ID"
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                            <button
                                type="submit"
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-lg transition-colors"
                            >
                                <Users size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Home;
