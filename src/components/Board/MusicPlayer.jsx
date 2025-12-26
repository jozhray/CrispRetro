import React, { useEffect, useRef, useState } from 'react';
import { Music, Volume2 } from 'lucide-react';

const TRACKS = [
    { name: 'Lofi Study', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112721.mp3' },
    { name: 'Cool Jazz', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=soft-jazz-1009.mp3' },
    { name: 'Morning Focus', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Creative Flow', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: 'Brainstorm', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { name: 'Productivity Boost', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { name: 'Sprint Mode', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { name: 'Lounge Session', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' },
    { name: 'Relaxing River', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
    { name: 'Uplifting Sky', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
    { name: 'Sunset Groove', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
    { name: 'Calm Night', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3' },
    { name: 'Gentle Rain', url: 'https://cdn.pixabay.com/audio/2025/11/15/audio_c5116879e1.mp3' },
    { name: 'Meditative Guitar', url: 'https://cdn.pixabay.com/audio/2024/11/24/audio_dcf6625030.mp3' },
    { name: 'Ambient Handpan', url: 'https://cdn.pixabay.com/audio/2025/10/09/audio_565547d988.mp3' },
    { name: 'Soft Piano', url: 'https://cdn.pixabay.com/audio/2025/12/05/audio_3580f915fd.mp3' },
    { name: 'Celtic Harp', url: 'https://cdn.pixabay.com/audio/2025/04/07/audio_8a3711f6a0.mp3' },
    { name: 'Peaceful Flute', url: 'https://cdn.pixabay.com/audio/2025/01/26/audio_3f5c09b7be.mp3' }
];

const MusicPlayer = ({
    music,
    isAdmin,
    onUpdateMusic,
    volume,
    onVolumeChange,
    audioBlocked,
    onResumeAudio
}) => {
    // const audioRef = useRef(new Audio(TRACKS[0].url)); // Moved to AudioManager
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
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

    const togglePlay = () => {
        if (!isAdmin) return;
        onResumeAudio?.();
        onUpdateMusic({ ...music, isPlaying: !music.isPlaying });
    };

    const handleTrackChange = (e) => {
        if (!isAdmin) return;
        onResumeAudio?.();
        onUpdateMusic({ ...music, currentTrack: e.target.value, isPlaying: true });
    };

    return (
        <div className="relative flex items-center gap-2 bg-gradient-to-r from-purple-900 to-indigo-900 px-2.5 rounded-lg shadow-lg h-8">
            {audioBlocked && music.isPlaying && (
                <div
                    onClick={onResumeAudio}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg cursor-pointer animate-bounce whitespace-nowrap z-50"
                >
                    Tap to Unmute 🔇
                </div>
            )}

            <Music size={16} className={music.isPlaying && !audioBlocked ? "text-purple-300 animate-pulse" : "text-purple-400"} />

            {isAdmin ? (
                <div className="flex items-center gap-2">
                    <select
                        value={music.currentTrack || TRACKS[0].url}
                        onChange={handleTrackChange}
                        className="text-xs border-none bg-purple-800/50 text-purple-100 rounded px-2 py-1 outline-none cursor-pointer max-w-[100px] truncate"
                    >
                        {TRACKS.map(track => (
                            <option key={track.url} value={track.url}>{track.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={togglePlay}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded transition-all ${music.isPlaying
                            ? 'bg-purple-500 text-white'
                            : 'bg-purple-700 text-purple-200 hover:bg-purple-600'
                            }`}
                    >
                        {music.isPlaying ? 'Stop' : 'Play'}
                    </button>
                </div>
            ) : (
                <span className="text-xs text-purple-300">
                    {music.isPlaying ? 'Music Playing...' : 'No Music'}
                </span>
            )}

            {/* Volume Slider */}
            <div className="relative" ref={volumeRef}>
                <button
                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    className={`p-1 rounded transition-all ${volume === 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-purple-700/50 hover:bg-purple-600/50 text-purple-300'
                        }`}
                    title="Music Volume"
                >
                    <Volume2 size={12} />
                </button>

                {showVolumeSlider && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-purple-900 rounded-xl shadow-xl border border-purple-700 min-w-[140px] z-50">
                        <div className="text-xs text-purple-300 mb-2 text-center">Music Volume</div>
                        <div className="relative h-2 bg-purple-800 rounded-full overflow-hidden">
                            <div
                                className="absolute h-full bg-gradient-to-r from-pink-500 to-purple-400 rounded-full transition-all"
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
                        <div className="flex justify-between text-[10px] text-purple-400 mt-1">
                            <span
                                onClick={() => onVolumeChange(0)}
                                className="cursor-pointer hover:text-purple-200 active:scale-95 transition-all font-semibold"
                            >
                                Mute
                            </span>
                            <span>{Math.round(volume * 100)}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusicPlayer;
