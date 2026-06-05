import React from 'react';

const AnimatedBackground = ({ type = 'bubbles' }) => {
    // Generate randomized animation properties once per session
    const items = React.useMemo(() => {
        const list = [];
        for (let i = 0; i < 100; i++) {
            list.push({
                id: i,
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                size: Math.random() * 20 + 5 + 'px',
                width: Math.random() * 80 + 30 + 'px',
                height: Math.random() * 80 + 30 + 'px',
                delay: Math.random() * 8 + 's',
                duration: Math.random() * 15 + 10 + 's',
                opacity: Math.random() * 0.5 + 0.2,
                color: ['rgba(6, 182, 212, 0.4)', 'rgba(168, 85, 247, 0.4)', 'rgba(236, 72, 153, 0.4)'][Math.floor(Math.random() * 3)],
                shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)]
            });
        }
        return list;
    }, []);

    // Render contents based on animation type
    const renderContent = () => {
        switch (type) {
            case 'bubbles':
                return (
                    <div className="absolute inset-0 opacity-60">
                        {items.slice(0, 25).map((item) => (
                            <div
                                key={item.id}
                                className="absolute rounded-full border border-blue-400/40 bg-blue-300/20 animate-float"
                                style={{
                                    width: item.width,
                                    height: item.width, // keep square for bubble
                                    left: item.left,
                                    bottom: '-100px',
                                    animationDelay: item.delay,
                                    animationDuration: item.duration,
                                }}
                            />
                        ))}
                    </div>
                );
            case 'stars':
                return (
                    <div className="absolute inset-0 opacity-90">
                        {items.slice(0, 80).map((item, index) => {
                            const isSparkle = index % 2 === 0;
                            const size = Math.max(8, parseFloat(item.size) / 1.2);
                            const color = index % 3 === 0 ? '#BFDBFE' : index % 4 === 0 ? '#FEF08A' : '#FFFFFF';
                            return (
                                <div
                                    key={item.id}
                                    className="absolute flex items-center justify-center animate-twinkle"
                                    style={{
                                        left: item.left,
                                        top: item.top,
                                        animationDelay: item.delay,
                                        animationDuration: parseFloat(item.duration) / 3 + 2 + 's',
                                        color: color,
                                        width: size + 'px',
                                        height: size + 'px',
                                        filter: `drop-shadow(0 0 4px ${color})`,
                                    }}
                                >
                                    {isSparkle ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                                            <path d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            case 'particles':
                return (
                    <div className="absolute inset-0 opacity-60 overflow-hidden">
                        {items.slice(0, 40).map((item) => {
                            return (
                                <div
                                    key={item.id}
                                    className="absolute animate-drift flex items-center justify-center drop-shadow-md"
                                    style={{
                                        width: item.size,
                                        height: item.size,
                                        left: item.left,
                                        top: '110%',
                                        color: item.color,
                                        animationDelay: item.delay,
                                        animationDuration: item.duration,
                                    }}
                                >
                                    {item.shape === 'circle' && (
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                                            <circle cx="12" cy="12" r="10" />
                                        </svg>
                                    )}
                                    {item.shape === 'square' && (
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                                            <rect x="2" y="2" width="20" height="20" rx="4" />
                                        </svg>
                                    )}
                                    {item.shape === 'triangle' && (
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                                            <path d="M12 2L22 20H2L12 2Z" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            case 'snow':
                return (
                    <div className="absolute inset-0 opacity-80 overflow-hidden">
                        {items.slice(0, 70).map((item, index) => {
                            const size = Math.max(10, parseFloat(item.size) / 1.5);
                            const spinDuration = Math.random() * 10 + 10;
                            const driftVar = index % 2 === 0 ? 'animate-snow' : 'animate-snow-reverse';
                            return (
                                <div
                                    key={item.id}
                                    className={`absolute flex items-center justify-center text-white/90 drop-shadow-md ${driftVar}`}
                                    style={{
                                        left: item.left,
                                        top: '-40px',
                                        width: size + 'px',
                                        height: size + 'px',
                                        animationDelay: item.delay,
                                        animationDuration: parseFloat(item.duration) / 1.5 + 8 + 's',
                                        opacity: Math.random() * 0.6 + 0.3,
                                    }}
                                >
                                    <svg className="w-full h-full animate-spin" style={{ animationDuration: spinDuration + 's', animationDirection: index % 2 === 0 ? 'normal' : 'reverse' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="2" y1="12" x2="22" y2="12"></line>
                                        <line x1="12" y1="2" x2="12" y2="22"></line>
                                        <path d="m20 16-4-4 4-4"></path>
                                        <path d="m4 8 4 4-4 4"></path>
                                        <path d="m16 4-4 4-4-4"></path>
                                        <path d="m8 20 4-4 4 4"></path>
                                    </svg>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'clouds':
                return (
                    <div className="absolute inset-0 opacity-80 overflow-hidden">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute animate-cloud select-none drop-shadow-2xl flex items-center justify-center"
                                style={{
                                    fontSize: (i * 15 + 60) + 'px',
                                    left: '-300px',
                                    top: (i * 8 + 2) + '%',
                                    animationDelay: i * 3 + 's',
                                    animationDuration: (i * 10 + 40) + 's',
                                    opacity: Math.random() * 0.5 + 0.5
                                }}
                            >
                                ☁️
                            </div>
                        ))}
                    </div>
                );
            case 'retro-grid':
                return (
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-950"></div>
                        <div className="retro-grid-lines"></div>
                        <div className="retro-horizon"></div>
                    </div>
                );
            case 'matrix':
                return (
                    <div className="absolute inset-0 overflow-hidden bg-slate-950">
                        {items.slice(0, 40).map((item) => (
                            <div
                                key={item.id}
                                className="matrix-column animate-matrix-fall"
                                style={{
                                    left: item.left,
                                    animationDelay: item.delay,
                                    animationDuration: parseFloat(item.duration) / 3 + 4 + 's',
                                    fontSize: Math.max(10, parseFloat(item.size) / 2) + 'px',
                                    opacity: item.opacity,
                                }}
                            >
                                {['1', '0', 'A', '7', 'Z', '9', 'X', 'B', 'M', 'Q'].map((char, index) => (
                                    <div key={index} className="text-green-500/80 font-mono py-0.5">{char}</div>
                                ))}
                            </div>
                        ))}
                    </div>
                );
            case 'aurora':
                return (
                    <div className="absolute inset-0 overflow-hidden bg-slate-950">
                        <div className="absolute top-0 left-1/4 w-[800px] h-[400px] rounded-[100%] bg-cyan-500/40 blur-[80px] animate-aurora-wave mix-blend-screen" />
                        <div className="absolute top-1/4 right-0 w-[700px] h-[500px] rounded-[100%] bg-purple-500/40 blur-[90px] animate-aurora-wave mix-blend-screen" style={{ animationDelay: '-4s' }} />
                        <div className="absolute bottom-0 left-1/4 w-[900px] h-[500px] rounded-[100%] bg-blue-500/40 blur-[100px] animate-aurora-wave mix-blend-screen" style={{ animationDelay: '-8s' }} />
                    </div>
                );
            case 'waves':
                return (
                    <div className="absolute bottom-0 left-0 right-0 h-[250px] overflow-hidden opacity-80 pointer-events-none">
                        <svg className="absolute bottom-0 w-[200%] h-[200px] animate-wave-continuous" viewBox="0 0 1200 120" preserveAspectRatio="none">
                            <path d="M 0,60 Q 150,120 300,60 T 600,60 T 900,60 T 1200,60 L 1200,120 L 0,120 Z" fill="rgba(147, 197, 253, 0.4)"></path>
                        </svg>
                        <svg className="absolute bottom-0 w-[200%] h-[220px] animate-wave-continuous-slow" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ animationDelay: '-5s' }}>
                            <path d="M 0,60 Q 150,0 300,60 T 600,60 T 900,60 T 1200,60 L 1200,120 L 0,120 Z" fill="rgba(167, 139, 250, 0.3)"></path>
                        </svg>
                        <svg className="absolute bottom-0 w-[200%] h-[250px] animate-wave-continuous" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ animationDelay: '-10s', animationDuration: '20s' }}>
                            <path d="M 0,60 Q 150,120 300,60 T 600,60 T 900,60 T 1200,60 L 1200,120 L 0,120 Z" fill="rgba(103, 232, 249, 0.2)"></path>
                        </svg>
                    </div>
                );
            case 'none':
            default:
                return null;
        }
    };

    // Determine the main background gradient class based on type
    const getBgGradient = () => {
        if (type === 'retro-grid' || type === 'matrix' || type === 'aurora') {
            return 'bg-slate-950'; // dark base for dark animations
        }
        return 'bg-gradient-to-br from-slate-200 via-blue-100 to-indigo-200'; // light retro base
    };

    return (
        <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-1000 ${getBgGradient()}`}>
            {renderContent()}

            {/* Always keep a gentle bottom fade to keep it clean */}
            {type !== 'retro-grid' && type !== 'matrix' && type !== 'aurora' && (
                <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-40">
                    <div className="absolute bottom-0 left-0 w-[200%] h-full bg-gradient-to-t from-blue-300/20 via-blue-200/5 to-transparent animate-wave" />
                </div>
            )}

            <style>{`
                /* Keyframes for Floating */
                @keyframes float {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 0.8; }
                    90% { opacity: 0.8; }
                    100% { transform: translateY(-115vh) translateX(30px); opacity: 0; }
                }
                
                /* Keyframes for Twinkling */
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }

                /* Keyframes for Snow */
                @keyframes snow {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(105vh) translateX(40px); opacity: 0; }
                }

                @keyframes snow-reverse {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(105vh) translateX(-40px); opacity: 0; }
                }

                /* Keyframes for Clouds */
                @keyframes cloud {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(100vw + 600px)); }
                }

                /* Keyframes for Drifting Geometrics */
                @keyframes drift {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.6; }
                    95% { opacity: 0.6; }
                    100% { transform: translateY(-120vh) rotate(360deg); opacity: 0; }
                }

                /* Keyframes for Wave */
                @keyframes wave-continuous {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }

                /* Keyframes for Aurora Wave */
                @keyframes aurora-wave {
                    0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    33% { transform: translate(30px, -50px) scale(1.1) rotate(10deg); }
                    66% { transform: translate(-20px, 40px) scale(0.9) rotate(-10deg); }
                }

                /* Keyframes for Matrix fall */
                @keyframes matrix-fall {
                    0% { transform: translateY(-150%); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(110vh); opacity: 0; }
                }

                .animate-float {
                    animation-name: float;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                }
                
                .animate-twinkle {
                    animation-name: twinkle;
                    animation-iteration-count: infinite;
                    animation-timing-function: ease-in-out;
                }

                .animate-snow {
                    animation-name: snow;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                .animate-snow-reverse {
                    animation-name: snow-reverse;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                .animate-cloud {
                    animation-name: cloud;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                .animate-drift {
                    animation-name: drift;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                .animate-wave-continuous {
                    animation: wave-continuous 15s linear infinite;
                }
                .animate-wave-continuous-slow {
                    animation: wave-continuous 25s linear infinite;
                }

                .animate-aurora-wave {
                    animation: aurora-wave 24s ease-in-out infinite;
                }

                .animate-matrix-fall {
                    animation-name: matrix-fall;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                /* Retro Grid CSS (Beautiful perspective lines) */
                .retro-grid-lines {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    bottom: 0;
                    background-image: 
                        linear-gradient(to right, rgba(6, 182, 212, 0.25) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(6, 182, 212, 0.25) 1px, transparent 1px);
                    background-size: 40px 40px;
                    transform: perspective(200px) rotateX(60deg);
                    transform-origin: 50% 100%;
                    animation: grid-scroll 2s linear infinite;
                }

                @keyframes grid-scroll {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 40px; }
                }

                .retro-horizon {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(to bottom, #020617 60%, rgba(6, 182, 212, 0.1) 100%);
                    border-bottom: 2px solid rgba(236, 72, 153, 0.6);
                    box-shadow: 0 0 15px 5px rgba(236, 72, 153, 0.3);
                }

                .matrix-column {
                    position: absolute;
                    top: -150px;
                    width: 20px;
                    text-align: center;
                    user-select: none;
                }
            `}</style>
        </div>
    );
};

export default AnimatedBackground;
