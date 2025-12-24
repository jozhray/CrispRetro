import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Layout as LayoutIcon } from 'lucide-react';
import { userService } from '../services/userService';

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userName = localStorage.getItem('crisp_user_name');
    const userEmail = localStorage.getItem('crisp_user_email');
    const isAdmin = !!userEmail;
    const isLoginPage = location.pathname === '/login';

    const handleLogout = () => {
        userService.logoutUser();
        navigate('/login');
    };

    if (isLoginPage) return null;

    // Don't show header on login page
    if (location.pathname === '/login') return null;

    return (
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
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white/90 line-clamp-1">{userName}</span>

                    {isAdmin && (
                        <button
                            onClick={handleLogout}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all ml-1"
                            title="Sign Out"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
