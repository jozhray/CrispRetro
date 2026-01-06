import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Mail, User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import { userService } from '../services/userService';
import { useToast } from '../components/Toast';

const Login = () => {
    const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'

    // Form States
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();

    const clearForm = () => {
        setPassword('');
        setConfirmPassword('');
        // Keep email/name for convenience when switching modes potentially
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (mode === 'register') {
                if (!name.trim() || !email.trim() || !password || !confirmPassword) {
                    toast.warning('All fields are required');
                    setIsLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    toast.error("Passwords don't match");
                    setIsLoading(false);
                    return;
                }

                await userService.registerUser(email, name, password);
                toast.success("Account created! Logging you in...");

                // Auto login after register
                const user = await userService.loginUser(email, password);
                saveSession(user);
                navigate('/');
            }
            else if (mode === 'login') {
                if (!email.trim() || !password) {
                    toast.warning('Please enter email and password');
                    setIsLoading(false);
                    return;
                }

                const user = await userService.loginUser(email, password);
                saveSession(user);
                toast.success(`Welcome back, ${user.name}!`);
                navigate('/');
            }
            else if (mode === 'forgot') {
                if (!email.trim()) {
                    toast.warning('Please enter your email address');
                    setIsLoading(false);
                    return;
                }

                await userService.sendResetEmail(email);
                toast.success("Reset link sent! Please check your email inbox.");
                setMode('login');
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const saveSession = (user) => {
        localStorage.setItem('crisp_user_name', user.name);
        localStorage.setItem('crisp_user_email', user.email);
        localStorage.setItem('crisp_user_id', user.id);
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {/* Animated Background matching Home.jsx */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="absolute inset-0 opacity-30">
                    <img
                        src="/hero-bg.jpg"
                        alt="background"
                        className="w-full h-full object-cover"
                    />
                </div>
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900 pointer-events-none"></div>

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
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-400/30 rounded-full text-cyan-300 text-sm mb-4 backdrop-blur-sm">
                        <Sparkles size={16} className="animate-pulse" />
                        <span>Next-Gen Retrospective Platform</span>
                    </div>

                    {/* Logo + Title Inline */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <img
                            src="/logo.png"
                            alt="CrispRetro Logo"
                            className="w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                        />
                        <h1 className="text-4xl md:text-5xl font-bold">
                            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                                CrispRetro
                            </span>
                        </h1>
                    </div>
                    <p className="text-gray-400">
                        {mode === 'login' && 'Sign in to continue'}
                        {mode === 'register' && 'Create your account'}
                        {mode === 'forgot' && 'Reset your password'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>

                    <div className="relative bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-cyan-500/20 shadow-2xl">
                        <form onSubmit={handleAuth} className="space-y-4">

                            {/* Name - Only for Register */}
                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-medium text-cyan-300 mb-2">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email - All Modes */}
                            <div>
                                <label className="block text-sm font-medium text-purple-300 mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password - Login & Register Only */}
                            {mode !== 'forgot' && (
                                <div>
                                    <label className="block text-sm font-medium text-pink-300 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pink-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Confirm Password - Register Only */}
                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-medium text-pink-300 mb-2">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pink-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Forgot Password Link - Only Login */}
                            {mode === 'login' && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { clearForm(); setMode('forgot'); }}
                                        className="text-sm text-gray-400 hover:text-white transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full relative group/btn overflow-hidden rounded-xl disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-100 group-hover/btn:opacity-90 transition-opacity"></div>
                                <div className="relative flex items-center justify-center gap-2 py-4 px-6 font-semibold text-white">
                                    <span>
                                        {isLoading ? 'Processing...' : (
                                            mode === 'login' ? 'Sign In' : (mode === 'register' ? 'Create Account' : 'Reset Password')
                                        )}
                                    </span>
                                    {!isLoading && <ArrowRight size={20} />}
                                </div>
                            </button>
                        </form>

                        {/* Mode Switching */}
                        <div className="mt-6 text-center space-y-2">
                            {mode === 'login' ? (
                                <p className="text-gray-400 text-sm">
                                    Don't have an account?{' '}
                                    <button onClick={() => { clearForm(); setMode('register'); }} className="text-cyan-400 hover:text-cyan-300 font-medium">
                                        Sign Up
                                    </button>
                                </p>
                            ) : (
                                <button
                                    onClick={() => { clearForm(); setMode('login'); }}
                                    className="flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm w-full transition-colors"
                                >
                                    <ArrowLeft size={14} /> Back to Login
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                <p className="text-xs text-gray-500/60 font-medium">
                    If any issue or suggestion please reach <a href="mailto:joshva@live.in" className="text-cyan-500/60 hover:text-cyan-400 transition-colors">joshva@live.in</a>
                </p>
            </div>
        </div>
    );
};

export default Login;
