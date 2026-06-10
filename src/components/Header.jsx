import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Camera } from 'lucide-react';
import { userService } from '../services/userService';
import AvatarPicker from './AvatarPicker';

const AvatarDisplay = ({ avatar, size = 'md', className = '', style = {} }) => {
    const sizeMap = {
        sm: 'w-7 h-7 text-base',
        md: 'w-8 h-8 text-lg',
        lg: 'w-12 h-12 text-2xl',
    };
    const isBase64 = avatar?.startsWith('data:image');
    return (
        <div 
            className={`${sizeMap[size]} rounded-full overflow-hidden flex items-center justify-center bg-slate-700 border-2 border-cyan-500/40 flex-shrink-0 ${className}`}
            style={style}
        >
            {isBase64
                ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                : <span className="leading-none select-none">{avatar || '👾'}</span>
            }
        </div>
    );
};

// Export so other components can reuse it
export { AvatarDisplay };

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userName, setUserName] = useState(localStorage.getItem('crisp_user_name') || '');
    const [userAvatar, setUserAvatar] = useState(localStorage.getItem('crisp_user_avatar') || '👾');
    const userEmail = localStorage.getItem('crisp_user_email');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [editAvatar, setEditAvatar] = useState(userAvatar);
    const isAdmin = !!userEmail;
    const isLoginPage = location.pathname === '/login';

    const handleLogoutClick = () => setShowLogoutModal(true);

    const confirmLogout = () => {
        userService.logoutUser();
        navigate('/login');
        setShowLogoutModal(false);
    };

    const handleOpenAvatarModal = () => {
        setEditAvatar(localStorage.getItem('crisp_user_avatar') || '👾');
        setShowAvatarModal(true);
    };

    const handleSaveAvatar = () => {
        localStorage.setItem('crisp_user_avatar', editAvatar);
        setUserAvatar(editAvatar);
        setShowAvatarModal(false);
        // Dispatch event so board updates online user presence
        window.dispatchEvent(new Event('crisp_avatar_changed'));
    };

    if (isLoginPage) return null;
    if (location.pathname === '/login') return null;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-900/80 backdrop-blur-md border-b border-white/10 h-12">
                <div className="container mx-auto h-full px-4 flex items-center justify-between">
                    {/* Logo & Brand */}
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate('/')}
                    >
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform" />
                        <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
                            CrispRetro
                        </span>
                    </div>

                    {/* User Info & Actions */}
                    <div className="flex items-center gap-2">
                        {/* Clickable Avatar + Name */}
                        <button
                            onClick={handleOpenAvatarModal}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-all group"
                            title="Change Avatar"
                        >
                            <AvatarDisplay avatar={userAvatar} size="sm" />
                            <span className="text-sm font-semibold text-white/90 truncate max-w-[120px] sm:max-w-[200px]" title={userName}>
                                {userName}
                            </span>
                            <Camera size={12} className="text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                        </button>

                        {isAdmin && (
                            <button
                                onClick={handleLogoutClick}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all ml-1"
                                title="Sign Out"
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Avatar Change Modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setShowAvatarModal(false)}
                    />
                    <div className="relative bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-5">
                            <AvatarDisplay avatar={editAvatar} size="lg" />
                            <div>
                                <h3 className="text-lg font-bold text-white">Change Avatar</h3>
                                <p className="text-sm text-gray-400">Choose an emoji or upload your photo</p>
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto pr-1">
                            <AvatarPicker avatar={editAvatar} setAvatar={setEditAvatar} />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-5">
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="py-2.5 px-4 rounded-xl bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAvatar}
                                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-all text-sm shadow-lg"
                            >
                                Save Avatar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setShowLogoutModal(false)}
                    />
                    <div className="relative bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut className="text-cyan-400" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-2">Sign Out?</h3>
                        <p className="text-sm text-gray-400 text-center mb-6">
                            Are you sure you want to sign out? You'll need to sign back in to access your boards.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="py-2.5 px-4 rounded-xl bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all text-sm shadow-lg shadow-cyan-500/25"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
