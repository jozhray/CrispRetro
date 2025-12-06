import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, Clock, X, Volume2 } from 'lucide-react';

// Timer presets in seconds (30-second increments)
const TIME_OPTIONS = [
    30, 60, 90, 120, 150, 180, 210, 240, 270, 300,  // 0:30 to 5:00
    330, 360, 390, 420, 450, 480, 510, 540, 570, 600, // 5:30 to 10:00
    660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, // 11:00 to 20:00
    1500, 1800, 2700, 3600 // 25, 30, 45, 60 minutes
];

const Timer = ({
    timer,
    isAdmin,
    onUpdateTimer,
    volume,
    onVolumeChange,
    audioBlocked,
    onResumeAudio
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const [selectedSeconds, setSelectedSeconds] = useState(timer.timeLeft || 180);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const pickerRef = useRef(null);
    const volumeRef = useRef(null);

    // Close volume slider when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (volumeRef.current && !volumeRef.current.contains(e.target)) {
                setShowVolumeSlider(false);
            }
        };
        if (showVolumeSlider) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showVolumeSlider]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartPause = () => {
        if (!isAdmin) return;
        onResumeAudio?.(); // Try to resume audio context globally via prop

        if (!timer.isRunning && !timer.timeLeft) {
            onUpdateTimer({ ...timer, isRunning: true, timeLeft: selectedSeconds || 180 });
        } else {
            onUpdateTimer({ ...timer, isRunning: !timer.isRunning });
        }
    };

    const handleReset = () => {
        if (!isAdmin) return;
        onUpdateTimer({ isRunning: false, timeLeft: selectedSeconds });
    };

    const handleSelectTime = (seconds) => {
        setSelectedSeconds(seconds);
        onUpdateTimer({ ...timer, timeLeft: seconds, isRunning: false });
        setShowPicker(false);
    };

    // Handle scroll selection in picker
    const handleScroll = (e) => {
        const container = e.target;
        const index = Math.round(container.scrollTop / 44);
        if (TIME_OPTIONS[index] !== undefined) {
            setSelectedSeconds(TIME_OPTIONS[index]);
        }
    };

    // Scroll to selected value when picker opens
    useEffect(() => {
        if (showPicker && pickerRef.current) {
            const index = TIME_OPTIONS.indexOf(selectedSeconds);
            if (index >= 0) {
                pickerRef.current.scrollTop = index * 44;
            }
        }
    }, [showPicker, selectedSeconds]);

    // Calculate progress for circular indicator
    const displayTime = timer.timeLeft || 180; // Default to 3:00 if 0
    const totalTime = selectedSeconds || 180;
    const progress = totalTime > 0 ? ((totalTime - displayTime) / totalTime) * 100 : 0;

    return (
        <>
            <div className="relative flex items-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2 rounded-xl shadow-lg h-[46px]">

                {audioBlocked && timer.isRunning && (
                    <div
                        onClick={onResumeAudio}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg cursor-pointer animate-bounce whitespace-nowrap z-50"
                    >
                        Tap to Unmute (Timer) 🔇
                    </div>
                )}

                {/* Circular progress indicator */}
                <div className="relative">
                    <svg className="w-8 h-8 transform -rotate-90">
                        <circle
                            cx="16" cy="16" r="14"
                            className="stroke-slate-700"
                            strokeWidth="3"
                            fill="none"
                        />
                        <circle
                            cx="16" cy="16" r="14"
                            className={`transition-all duration-1000 ease-linear ${timer.timeLeft <= 10 ? 'stroke-red-500' : 'stroke-blue-400'}`}
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={88}
                            strokeDashoffset={88 - (88 * progress) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Clock size={12} className="text-slate-400" />
                    </div>
                </div>

                <div className="flex flex-col items-start min-w-[50px]">
                    <span className={`text-xl font-bold font-mono leading-none tracking-wider ${timer.timeLeft <= 10 && timer.isRunning ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        {formatTime(timer.timeLeft || 180)}
                    </span>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleStartPause}
                            className={`p-1.5 rounded-lg transition-all ${timer.isRunning
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                }`}
                            title={timer.isRunning ? "Pause" : "Start"}
                        >
                            {timer.isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>

                        <button
                            onClick={handleReset}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            title="Reset"
                        >
                            <RotateCcw size={16} />
                        </button>

                        {/* Timer Picker Toggle */}
                        <button
                            onClick={() => setShowPicker(!showPicker)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            title="Set Time"
                        >
                            <Clock size={16} />
                        </button>
                    </div>
                )}

                {/* Volume Slider */}
                <div className="relative" ref={volumeRef}>
                    <button
                        onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                        className={`p-1.5 rounded-lg transition-all ${volume === 0
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                            }`}
                        title="Timer Volume"
                    >
                        <Volume2 size={14} />
                    </button>

                    {showVolumeSlider && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-slate-900 rounded-xl shadow-xl border border-slate-700 min-w-[140px] z-50">
                            <div className="text-xs text-slate-300 mb-2 text-center">Timer Volume</div>
                            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="absolute h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${volume * 100}%` }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                <span
                                    onClick={() => onVolumeChange(0)}
                                    className="cursor-pointer hover:text-slate-300 active:scale-95 transition-all font-semibold"
                                >
                                    Mute
                                </span>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Time Picker Modal */}
            {showPicker && (
                createPortal(
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPicker(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Clock size={18} /> Set Timer
                                </h3>
                                <button onClick={() => setShowPicker(false)} className="hover:bg-slate-800 p-1 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="h-64 overflow-y-auto p-2 scroll-smooth" ref={pickerRef} onScroll={handleScroll}>
                                {TIME_OPTIONS.map((seconds) => (
                                    <button
                                        key={seconds}
                                        onClick={() => handleSelectTime(seconds)}
                                        className={`w-full text-center py-3 text-lg font-mono rounded-xl transition-colors mb-1
                                            ${selectedSeconds === seconds
                                                ? 'bg-blue-500 text-white shadow-md transform scale-105'
                                                : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {formatTime(seconds)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            )}
        </>
    );
};

export default Timer;
