import React, { useEffect, useRef, useState } from 'react';
import { Music, Volume2 } from 'lucide-react';

const TRACKS = [
    { name: 'Lofi Study', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112721.mp3' },
    { name: 'Cool Jazz', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=soft-jazz-1009.mp3' },
    { name: 'Morning Focus', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: 'Creative Flow', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: 'Deep Work', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { name: 'Brainstorm', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { name: 'Team Energy', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { name: 'Productivity Boost', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { name: 'Sprint Mode', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { name: 'Chill Vibes', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
    { name: 'Retro Thinking', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
    { name: 'Action Items', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' }
];

const MusicPlayer = ({ music, isAdmin, onUpdateMusic }) => {
    const audioRef = useRef(new Audio(TRACKS[0].url));
    const [volume, setVolume] = useState(0.5);
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

    useEffect(() => {
        audioRef.current.loop = true;
        audioRef.current.volume = volume;
        return () => {
            audioRef.current.pause();
        };
    }, []);

    // Handle volume changes
    useEffect(() => {
        audioRef.current.volume = volume;
    }, [volume]);

    // Handle Track Changes
    useEffect(() => {
        if (music.currentTrack && music.currentTrack !== audioRef.current.src) {
            const wasPlaying = !audioRef.current.paused;
            audioRef.current.src = music.currentTrack;
            if (wasPlaying || music.isPlaying) {
                audioRef.current.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    }, [music.currentTrack]);

    // Handle Play/Pause
    useEffect(() => {
        if (music.isPlaying) {
            audioRef.current.play().catch(e => console.log("Audio play failed (likely autoplay policy):", e));
        } else {
            audioRef.current.pause();
        }
    }, [music.isPlaying]);

    const togglePlay = () => {
        if (!isAdmin) return;
        onUpdateMusic({ ...music, isPlaying: !music.isPlaying });
    };

    const handleTrackChange = (e) => {
        if (!isAdmin) return;
        onUpdateMusic({ ...music, currentTrack: e.target.value, isPlaying: true });
    };

    return (
        <div className="flex items-center gap-3 bg-gradient-to-r from-purple-900 to-indigo-900 px-4 py-2 rounded-xl shadow-lg h-[46px]">
            <Music size={16} className={music.isPlaying ? "text-purple-300 animate-pulse" : "text-purple-400"} />

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
                        className={`text-xs font-medium px-3 py-1 rounded-lg transition-all ${music.isPlaying
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
                    className={`p-1.5 rounded-lg transition-all ${volume === 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-purple-700/50 hover:bg-purple-600/50 text-purple-300'
                        }`}
                    title="Music Volume"
                >
                    <Volume2 size={14} />
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
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-purple-400 mt-1">
                            <span>Mute</span>
                            <span>{Math.round(volume * 100)}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusicPlayer;
