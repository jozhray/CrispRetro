import React, { useEffect, useRef } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';

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
    const [isMuted, setIsMuted] = React.useState(false);

    useEffect(() => {
        audioRef.current.loop = true;
        return () => {
            audioRef.current.pause();
        };
    }, []);

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

    useEffect(() => {
        audioRef.current.muted = isMuted;
    }, [isMuted]);

    const togglePlay = () => {
        if (!isAdmin) return;
        onUpdateMusic({ ...music, isPlaying: !music.isPlaying });
    };

    const handleTrackChange = (e) => {
        if (!isAdmin) return;
        onUpdateMusic({ ...music, currentTrack: e.target.value, isPlaying: true });
    };

    return (
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
            <Music size={16} className={music.isPlaying ? "text-purple-600 animate-pulse" : "text-gray-400"} />

            {isAdmin ? (
                <div className="flex items-center gap-2">
                    <select
                        value={music.currentTrack || TRACKS[0].url}
                        onChange={handleTrackChange}
                        className="text-xs border-none bg-gray-50 rounded px-2 py-1 outline-none cursor-pointer max-w-[100px] truncate"
                    >
                        {TRACKS.map(track => (
                            <option key={track.url} value={track.url}>{track.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={togglePlay}
                        className={`text-xs font-medium px-2 py-1 rounded ${music.isPlaying ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {music.isPlaying ? 'Stop' : 'Play'}
                    </button>
                </div>
            ) : (
                <span className="text-xs text-gray-500">
                    {music.isPlaying ? 'Music Playing...' : 'No Music'}
                </span>
            )}

            <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 ml-1"
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
        </div>
    );
};

export default MusicPlayer;
