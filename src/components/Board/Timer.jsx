import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

const Timer = ({ timer, isAdmin, onUpdateTimer }) => {
    useEffect(() => {
        let interval;
        if (timer.isRunning && timer.timeLeft > 0) {
            interval = setInterval(() => {
                onUpdateTimer({
                    ...timer,
                    timeLeft: Math.max(0, timer.timeLeft - 1)
                });
            }, 1000);
        } else if (timer.timeLeft === 0 && timer.isRunning) {
            onUpdateTimer({ ...timer, isRunning: false });
        }
        return () => clearInterval(interval);
    }, [timer, onUpdateTimer]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartPause = () => {
        if (!isAdmin) return;
        onUpdateTimer({ ...timer, isRunning: !timer.isRunning });
    };

    const handleReset = () => {
        if (!isAdmin) return;
        onUpdateTimer({ isRunning: false, timeLeft: 60 }); // Default 1 min
    };

    const adjustTime = (minutes) => {
        if (!isAdmin) return;
        const newTime = timer.timeLeft + (minutes * 60);
        if (newTime < 60) return; // Minimum 1 minute
        onUpdateTimer({ ...timer, timeLeft: newTime });
    };

    return (
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
            <Clock size={16} className="text-gray-500" />
            <span className={`font-mono font-bold text-lg ${timer.timeLeft < 60 && timer.isRunning ? 'text-red-600' : 'text-gray-700'}`}>
                {formatTime(timer.timeLeft)}
            </span>

            {isAdmin && (
                <div className="flex items-center gap-1 ml-2 border-l pl-2 border-gray-200">
                    <button onClick={handleStartPause} className="p-1 hover:bg-gray-100 rounded text-gray-600" title={timer.isRunning ? "Pause" : "Start"}>
                        {timer.isRunning ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={handleReset} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Reset to 1m">
                        <RotateCcw size={14} />
                    </button>
                    <div className="flex gap-1 ml-1">
                        <button onClick={() => adjustTime(-1)} className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-medium">-1m</button>
                        <button onClick={() => adjustTime(1)} className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded font-medium">+1m</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timer;
