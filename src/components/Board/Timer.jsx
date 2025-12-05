import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, X, Volume2 } from 'lucide-react';

// Timer presets in seconds (30-second increments)
const TIME_OPTIONS = [
    30, 60, 90, 120, 150, 180, 210, 240, 270, 300,  // 0:30 to 5:00
    330, 360, 390, 420, 450, 480, 510, 540, 570, 600, // 5:30 to 10:00
    660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, // 11:00 to 20:00
    1500, 1800, 2700, 3600 // 25, 30, 45, 60 minutes
];

const Timer = ({ timer, isAdmin, onUpdateTimer, music, onUpdateMusic }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [selectedSeconds, setSelectedSeconds] = useState(timer.timeLeft || 180);
    const [volume, setVolume] = useState(0.5);
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

    // Play alarm sound using Web Audio API (guaranteed to work)
    const playAlarmSound = () => {
        if (volume === 0) return; // Muted

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Play a pleasant chord sequence
            const playTone = (freq, startTime, duration) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = freq;
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(volume * 0.5, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            const now = audioContext.currentTime;
            // Pleasant chime chord (C major arpeggio)
            playTone(523.25, now, 0.3);        // C5
            playTone(659.25, now + 0.1, 0.3);  // E5
            playTone(783.99, now + 0.2, 0.4);  // G5
            playTone(1046.50, now + 0.3, 0.5); // C6
        } catch (e) {
            console.log('Audio not supported');
        }
    };

    // Play tick sound using Web Audio API
    const playTickSound = () => {
        if (music?.isPlaying || volume === 0) return; // Don't play if music is playing or muted

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(volume * 0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (e) {
            // Silent fail
        }
    };

    // Timer countdown logic
    useEffect(() => {
        let interval;
        if (timer.isRunning && timer.timeLeft > 0) {
            interval = setInterval(() => {
                // Play tick sound if music is NOT playing
                playTickSound();

                onUpdateTimer({
                    ...timer,
                    timeLeft: Math.max(0, timer.timeLeft - 1)
                });
            }, 1000);
        } else if (timer.timeLeft === 0 && timer.isRunning) {
            // Timer finished!
            onUpdateTimer({ ...timer, isRunning: false });

            // Stop music if playing
            if (music?.isPlaying && onUpdateMusic) {
                onUpdateMusic({ ...music, isPlaying: false });
            }

            // Play alarm sound
            playAlarmSound();
        }
        return () => clearInterval(interval);
    }, [timer, onUpdateTimer, music, onUpdateMusic]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartPause = () => {
        if (!isAdmin) return;
        // If starting and timeLeft is 0, set it to the selected time (default 180)
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
        const itemHeight = 44; // Height of each option
        const scrollTop = container.scrollTop;
        const index = Math.round(scrollTop / itemHeight);
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
            <div className="flex items-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2 rounded-xl shadow-lg h-[46px]">
                {/* Circular progress indicator */}
                <div className="relative">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke="#374151"
                            strokeWidth="3"
                        />
                        <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            stroke={displayTime < 60 && timer.isRunning ? "#ef4444" : "#3b82f6"}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${progress * 0.94} 100`}
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <Clock size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* Time display - clickable for admin */}
                <button
                    onClick={() => isAdmin && !timer.isRunning && setShowPicker(true)}
                    className={`font-mono font-bold text-2xl min-w-[80px] text-center ${displayTime < 60 && timer.isRunning
                        ? 'text-red-400 animate-pulse'
                        : 'text-white'
                        } ${isAdmin && !timer.isRunning ? 'hover:text-blue-400 cursor-pointer' : ''}`}
                    disabled={!isAdmin || timer.isRunning}
                    title={isAdmin && !timer.isRunning ? "Click to set time" : ""}
                >
                    {formatTime(displayTime)}
                </button>

                {isAdmin && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleStartPause}
                            className={`p-2 rounded-lg transition-all ${timer.isRunning
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                            title={timer.isRunning ? "Pause" : "Start"}
                        >
                            {timer.isRunning ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                            onClick={handleReset}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-all"
                            title="Reset"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                )}

                {/* Volume Control - Available to all users */}
                <div className="relative" ref={volumeRef}>
                    <button
                        onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                        className={`p-2 rounded-lg transition-all ${volume === 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                        title="Timer Volume"
                    >
                        <Volume2 size={16} />
                    </button>

                    {showVolumeSlider && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-slate-800 rounded-xl shadow-xl border border-slate-700 min-w-[140px] z-50">
                            <div className="text-xs text-slate-400 mb-2 text-center">Timer Volume</div>
                            <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                                    style={{ width: `${volume * 100}%` }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                <span>Mute</span>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* iOS-style Scroll Picker Modal */}
            {showPicker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50" onClick={() => setShowPicker(false)}>
                    <div
                        className="bg-slate-900 w-full max-w-sm rounded-t-3xl p-6 pb-10 animate-slide-up"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-semibold text-lg">Set Timer</h3>
                            <button
                                onClick={() => setShowPicker(false)}
                                className="p-1 hover:bg-slate-800 rounded-full text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scroll Picker */}
                        <div className="relative h-[220px] overflow-hidden">
                            {/* Gradient overlays */}
                            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />

                            {/* Selection highlight */}
                            <div className="absolute top-1/2 left-0 right-0 h-11 -translate-y-1/2 bg-blue-500/20 border-y border-blue-500/40 z-5" />

                            {/* Scrollable list */}
                            <div
                                ref={pickerRef}
                                className="h-full overflow-y-scroll scroll-smooth snap-y snap-mandatory scrollbar-hide py-[88px]"
                                onScroll={handleScroll}
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {TIME_OPTIONS.map((secs) => (
                                    <div
                                        key={secs}
                                        onClick={() => handleSelectTime(secs)}
                                        className={`h-11 flex items-center justify-center snap-center cursor-pointer transition-all ${selectedSeconds === secs
                                            ? 'text-white text-2xl font-bold'
                                            : 'text-slate-500 text-xl'
                                            }`}
                                    >
                                        {formatTime(secs)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={() => handleSelectTime(selectedSeconds)}
                            className="w-full mt-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            Set {formatTime(selectedSeconds)}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </>
    );
};

export default Timer;
