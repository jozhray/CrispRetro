import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const TOAST_TYPES = {
    success: {
        icon: CheckCircle,
        bgClass: 'bg-green-500',
        iconClass: 'text-green-100'
    },
    error: {
        icon: AlertCircle,
        bgClass: 'bg-red-500',
        iconClass: 'text-red-100'
    },
    warning: {
        icon: AlertTriangle,
        bgClass: 'bg-amber-500',
        iconClass: 'text-amber-100'
    },
    info: {
        icon: Info,
        bgClass: 'bg-blue-500',
        iconClass: 'text-blue-100'
    }
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        warning: (message, duration) => addToast(message, 'warning', duration),
        info: (message, duration) => addToast(message, 'info', duration),
        show: addToast
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(({ id, message, type }) => {
                        const { icon: Icon, bgClass, iconClass } = TOAST_TYPES[type] || TOAST_TYPES.info;

                        return (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${bgClass} text-white min-w-[280px] max-w-md`}
                            >
                                <Icon size={20} className={iconClass} />
                                <p className="flex-1 text-sm font-medium">{message}</p>
                                <button
                                    onClick={() => removeToast(id)}
                                    className="p-1 hover:bg-white/20 rounded transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
