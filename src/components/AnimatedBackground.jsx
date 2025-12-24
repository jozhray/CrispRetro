import React from 'react';

const AnimatedBackground = () => {
    // Generate bubbles once and persist them
    const bubbles = React.useMemo(() => {
        return [...Array(30)].map((_, i) => ({
            id: i,
            width: Math.random() * 80 + 30 + 'px',
            height: Math.random() * 80 + 30 + 'px',
            left: Math.random() * 100 + '%',
            animationDelay: Math.random() * 5 + 's',
            animationDuration: Math.random() * 15 + 15 + 's',
        }));
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-br from-slate-200 via-blue-100 to-indigo-200">
            {/* Floating Crisp Bubbles */}
            <div className="absolute inset-0 opacity-60">
                {bubbles.map((bubble) => (
                    <div
                        key={bubble.id}
                        className="absolute rounded-full border border-blue-400/50 bg-blue-300/30 animate-float"
                        style={{
                            width: bubble.width,
                            height: bubble.height,
                            left: bubble.left,
                            bottom: -100 + 'px',
                            animationDelay: bubble.animationDelay,
                            animationDuration: bubble.animationDuration,
                        }}
                    />
                ))}
            </div>

            {/* Gentle Wave Effect */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-60">
                <div className="absolute bottom-0 left-0 w-[200%] h-full bg-gradient-to-t from-blue-300/30 via-blue-200/10 to-transparent animate-wave"
                    style={{ transform: 'translate3d(0,0,0)' }}></div>
                <div className="absolute bottom-0 left-0 w-[200%] h-3/4 bg-gradient-to-t from-indigo-300/20 via-purple-200/10 to-transparent animate-wave-slow"
                    style={{ transform: 'translate3d(0,0,0)', animationDelay: '-5s' }}></div>
            </div>

            <style>{`
                @keyframes float {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
                }
                @keyframes wave {
                    0% { transform: translateX(0); }
                    50% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }
                }
                @keyframes wave-slow {
                    0% { transform: translateX(-50%); }
                    50% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-float {
                    animation-name: float;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                }
                .animate-wave {
                    animation: wave 20s ease-in-out infinite;
                }
                .animate-wave-slow {
                    animation: wave-slow 30s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default AnimatedBackground;
