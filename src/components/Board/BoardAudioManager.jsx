import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const BoardAudioManager = forwardRef(({
    music,
    timer,
    musicVolume,
    timerVolume,
    onUpdateTimer,
    onUpdateMusic,
    onAudioBlocked,
    isAdmin
}, ref) => {

    // --- MUSIC PLAYER LOGIC ---
    const audioRef = useRef(new Audio());

    // Keep a ref to music state to avoid stale closures in interval
    const musicRef = useRef(music);
    musicRef.current = music;

    // update volume immediately
    useEffect(() => {
        audioRef.current.volume = musicVolume;
    }, [musicVolume]);

    // Default track URL (Lofi Study)
    const DEFAULT_TRACK = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112721.mp3';

    // Initialize/Cleanup Music
    useEffect(() => {
        audioRef.current.loop = true;
        // Set initial source immediately to avoid empty play
        audioRef.current.src = music.currentTrack || DEFAULT_TRACK;
        return () => {
            audioRef.current.pause();
        };
    }, []);

    // Handle Music Track/Play State
    useEffect(() => {
        const targetTrack = music.currentTrack || DEFAULT_TRACK;

        // Update source if changed
        if (targetTrack !== audioRef.current.src) {
            const wasPlaying = !audioRef.current.paused;
            audioRef.current.src = targetTrack;
            if (wasPlaying || music.isPlaying) {
                audioRef.current.play().catch(e => {
                    console.error("Music Play failed", e);
                    onAudioBlocked?.(true);
                });
            }
        }

        // Handle Play/Pause
        if (music.isPlaying) {
            console.log("Manager: Attempting to play music...", targetTrack);
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Manager: Play success");
                        onAudioBlocked?.(false);
                    })
                    .catch(error => {
                        console.error("Manager: Autoplay blocked (Music):", error);
                        onAudioBlocked?.(true);
                    });
            }
        } else {
            console.log("Manager: Pausing music");
            audioRef.current.pause();
        }
    }, [music.currentTrack, music.isPlaying]);

    // --- TIMER AUDIO LOGIC ---
    const audioContextRef = useRef(null);

    const getAudioContext = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    };

    const playTimerSound = (type = 'tick') => {
        if (timerVolume === 0) return;

        // Don't play tick if music is playing (Check via Ref to avoid stale closure)
        if (type === 'tick' && musicRef.current.isPlaying) return;

        console.log("Playing Timer Sound:", type, "Music Playing:", musicRef.current.isPlaying, "Music State:", musicRef.current);

        try {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') {
                onAudioBlocked?.(true);
                return;
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'tick') {
                osc.frequency.value = 800;
                osc.type = 'sine';
                gain.gain.setValueAtTime(timerVolume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'alarm') {
                // Play chord
                const playTone = (freq, offset, duration) => {
                    const tOsc = ctx.createOscillator();
                    const tGain = ctx.createGain();
                    tOsc.connect(tGain);
                    tGain.connect(ctx.destination);
                    tOsc.frequency.value = freq;
                    tOsc.type = 'sine';
                    tGain.gain.setValueAtTime(timerVolume * 0.5, now + offset);
                    tGain.gain.exponentialRampToValueAtTime(0.01, now + offset + duration);
                    tOsc.start(now + offset);
                    tOsc.stop(now + offset + duration);
                };

                playTone(523.25, 0, 0.3);
                playTone(659.25, 0.1, 0.3);
                playTone(783.99, 0.2, 0.4);
                playTone(1046.50, 0.3, 0.5);
            }

        } catch (e) {
            console.error("Timer Audio Error", e);
        }
    };

    // --- TIMER INTERVAL LOGIC ---
    // Only running the interval in ONE place avoids double-speed countdowns
    useEffect(() => {
        let interval;
        if (timer.isRunning && timer.timeLeft > 0) {
            interval = setInterval(() => {
                // Play tick (Every 5s or last 5s)
                if (timer.timeLeft % 5 === 0 || timer.timeLeft <= 5) {
                    playTimerSound('tick');
                }

                // Update time using function form to ensure latest state interaction isn't needed 
                // but we typically use the prop. 
                // NOTE: We need to be careful about not depending on 'timer' object too heavily if it changes every second.
                // But onUpdateTimer updates the state in parent.
                onUpdateTimer({
                    ...timer,
                    timeLeft: Math.max(0, timer.timeLeft - 1)
                });
            }, 1000);
        } else if (timer.timeLeft === 0 && timer.isRunning) {
            // Timer Finished
            onUpdateTimer({ ...timer, isRunning: false });

            // Stop Music
            if (music.isPlaying && isAdmin) {
                onUpdateMusic({ ...music, isPlaying: false });
            }

            // Play Alarm
            playTimerSound('alarm');
        }
        return () => clearInterval(interval);
    }, [timer.isRunning, timer.timeLeft]);

    // --- EXPOSE RESUME METHOD ---
    useImperativeHandle(ref, () => ({
        resumeAudio: () => {
            // Resume Music only if it's supposed to be playing
            if (audioRef.current && musicRef.current.isPlaying) {
                audioRef.current.play()
                    .then(() => onAudioBlocked?.(false))
                    .catch(e => console.error("Resume music failed", e));
            }
            // Resume Context (always needed for timer sounds)
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().then(() => onAudioBlocked?.(false));
            }
        }
    }));

    return null; // This component has no UI
});

export default BoardAudioManager;
