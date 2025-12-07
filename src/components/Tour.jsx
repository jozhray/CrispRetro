import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Tour = ({ steps, onComplete, storageKey = 'crisp_tour_completed' }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        const tourCompleted = localStorage.getItem(storageKey);
        if (!tourCompleted) {
            const timer = setTimeout(() => setIsVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, [storageKey]);

    // Auto-scroll to target
    useEffect(() => {
        if (!isVisible || !steps[currentStep]?.target) return;

        const element = document.querySelector(steps[currentStep].target);
        if (element) {
            // Small delay to ensure layout stability (e.g. keyboard closing)
            setTimeout(() => {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center'
                });
            }, 300);
        }
    }, [currentStep, isVisible, steps]);

    // Calculate position relative to the document (not viewport)
    const updateTargetPosition = useCallback(() => {
        if (!isVisible || !steps[currentStep]?.target) {
            setTargetRect(null);
            return;
        }

        const element = document.querySelector(steps[currentStep].target);
        if (element) {
            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;

            // Get position relative to the document
            setTargetRect({
                top: rect.top + scrollY - 8,
                left: rect.left + scrollX - 8,
                width: rect.width + 16,
                height: rect.height + 16,
                // Also store viewport-relative for highlight box
                viewportTop: rect.top - 8,
                viewportLeft: rect.left - 8,
            });
        } else {
            setTargetRect(null);
        }
    }, [currentStep, isVisible, steps]);

    // Update position on step change, scroll, resize, and zoom
    useEffect(() => {
        if (!isVisible) return;

        // Initial calculation
        const timer = setTimeout(updateTargetPosition, 100);

        // Listen for scroll and resize
        window.addEventListener('scroll', updateTargetPosition, true);
        window.addEventListener('resize', updateTargetPosition);

        // Also listen for zoom changes via visualViewport if available
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateTargetPosition);
            window.visualViewport.addEventListener('scroll', updateTargetPosition);
        }

        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', updateTargetPosition, true);
            window.removeEventListener('resize', updateTargetPosition);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateTargetPosition);
                window.visualViewport.removeEventListener('scroll', updateTargetPosition);
            }
        };
    }, [currentStep, isVisible, updateTargetPosition]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(storageKey, 'true');
        setIsVisible(false);
        if (onComplete) onComplete();
    };

    const handleSkip = () => {
        localStorage.setItem(storageKey, 'true');
        setIsVisible(false);
    };

    if (!isVisible || !steps || steps.length === 0) return null;

    const step = steps[currentStep];
    const hasTarget = targetRect !== null;

    // Calculate tooltip position relative to the viewport
    const getTooltipStyle = () => {
        // Mobile-first: Smart Docking
        if (window.innerWidth < 768) {
            const isTargetBottom = targetRect && targetRect.viewportTop > window.innerHeight / 2;
            const width = Math.min(window.innerWidth - 32, 400);
            const left = (window.innerWidth - width) / 2;

            return {
                position: 'fixed',
                [isTargetBottom ? 'top' : 'bottom']: '24px', // Flip position based on target
                left: `${left}px`,
                // No transform here to avoid conflict with Framer Motion
                width: `${width}px`,
                zIndex: 200 // Ensure above overlay
            };
        }

        if (!targetRect) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 200
            };
        }

        // Desktop Positioning Logic
        const tooltipWidth = 340;
        const tooltipHeight = 280;
        const padding = 16;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Use viewport-relative coordinates for the tooltip
        let top = targetRect.viewportTop + targetRect.height + padding;
        let left = targetRect.viewportLeft + (targetRect.width / 2) - (tooltipWidth / 2);

        // If below doesn't fit, try above
        if (top + tooltipHeight > windowHeight - padding) {
            top = targetRect.viewportTop - tooltipHeight - padding;
        }

        // Keep within horizontal bounds
        left = Math.max(padding, Math.min(left, windowWidth - tooltipWidth - padding));

        // If above doesn't fit either, position to the side
        if (top < padding) {
            top = Math.max(padding, Math.min(
                targetRect.viewportTop + (targetRect.height / 2) - (tooltipHeight / 2),
                windowHeight - tooltipHeight - padding
            ));
            // Try right side
            left = targetRect.viewportLeft + targetRect.width + padding;
            if (left + tooltipWidth > windowWidth - padding) {
                // Try left side
                left = targetRect.viewportLeft - tooltipWidth - padding;
            }
        }

        return {
            position: 'fixed',
            top: `${Math.max(padding, top)}px`,
            left: `${Math.max(padding, left)}px`,
            transform: 'none',
            zIndex: 200
        };
    };

    return createPortal(
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[150]"
                    ref={overlayRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Dark overlay with spotlight cutout */}
                    <div
                        className="absolute inset-0 transition-all duration-300"
                        onClick={handleSkip}
                        style={{
                            background: hasTarget
                                ? `radial-gradient(ellipse ${targetRect.width + 40}px ${targetRect.height + 40}px at ${targetRect.viewportLeft + targetRect.width / 2}px ${targetRect.viewportTop + targetRect.height / 2}px, transparent 0%, transparent 60%, rgba(0,0,0,0.75) 100%)`
                                : 'rgba(0,0,0,0.75)'
                        }}
                    />

                    {/* Highlight border around target */}
                    {hasTarget && (
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="fixed border-2 border-cyan-400 rounded-xl pointer-events-none z-[151]"
                            style={{
                                top: targetRect.viewportTop,
                                left: targetRect.viewportLeft,
                                width: targetRect.width,
                                height: targetRect.height,
                                boxShadow: '0 0 0 4px rgba(6, 182, 212, 0.3), 0 0 30px rgba(6, 182, 212, 0.5)',
                            }}
                        />
                    )}

                    {/* Tour Card */}
                    <motion.div
                        key={`tooltip-${currentStep}`}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="pointer-events-auto"
                        style={getTooltipStyle()}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-sm max-h-[80vh] flex flex-col">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 p-4 text-white shrink-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} />
                                        <span className="text-xs font-medium opacity-90">
                                            Step {currentStep + 1} of {steps.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleSkip}
                                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <h2 className="text-lg font-bold">{step.title}</h2>
                            </div>

                            {/* Content */}
                            <div className="p-4 overflow-y-auto">
                                {step.icon && !hasTarget && (
                                    <div className="flex justify-center mb-3">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-100 to-purple-100 flex items-center justify-center text-2xl">
                                            {step.icon}
                                        </div>
                                    </div>
                                )}

                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                                    {step.description}
                                </p>

                                {/* Progress dots */}
                                <div className="flex justify-center gap-1.5 mb-4">
                                    {steps.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentStep(index)}
                                            className={`h-1.5 rounded-full transition-all ${index === currentStep
                                                ? 'w-5 bg-purple-500'
                                                : index < currentStep
                                                    ? 'w-1.5 bg-purple-300'
                                                    : 'w-1.5 bg-gray-200'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Navigation */}
                                <div className="flex gap-2">
                                    {currentStep > 0 ? (
                                        <button
                                            onClick={handlePrev}
                                            className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                                        >
                                            <ChevronLeft size={16} />
                                            Back
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSkip}
                                            className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Skip
                                        </button>
                                    )}
                                    <button
                                        onClick={handleNext}
                                        className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 shadow-lg shadow-purple-500/20"
                                    >
                                        {currentStep === steps.length - 1 ? "Let's Go!" : (
                                            <>Next <ChevronRight size={16} /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// Tour steps for Home page
export const HOME_TOUR_STEPS = [
    {
        title: 'Welcome to CrispRetro! 👋',
        description: 'Your all-in-one sprint retrospective platform. Let\'s take a quick tour!',
        icon: '🚀'
    },
    {
        title: 'Enter Your Name',
        description: 'Start by entering your name here. This will be shown on your notes.',
        icon: '👤',
        target: '#user-name'
    },
    {
        title: 'Create a Board',
        description: 'Enter a board name and click "Create New Board" to start your retro!',
        icon: '✨',
        target: '#board-name'
    },
    {
        title: 'Join Existing Board',
        description: 'Or paste a Board ID here to join your team\'s session!',
        icon: '🤝',
        target: '#join-board'
    }
];

// Tour steps for Board page (Admin)
export const BOARD_TOUR_STEPS_ADMIN = [
    {
        title: 'Your Retro Board 🎉',
        description: 'Welcome! As the admin, you have full control over this session.',
        icon: '👑'
    },
    {
        title: 'Board Name',
        description: 'Click here to rename your board. Only you can edit this!',
        icon: '📝',
        target: 'input.text-2xl'
    },
    {
        title: 'Timer & Music',
        description: 'Set a timer for discussions and play background music!',
        icon: '⏱️'
    },
    {
        title: 'Quick Polls',
        description: 'Create polls to gather team opinions quickly! Results are shown in real-time.',
        icon: '📊'
    },
    {
        title: 'Add & Vote',
        description: 'Click + to add notes. Everyone can vote 👍 on ideas!',
        icon: '✨'
    },
    {
        title: 'Invite Team',
        description: 'Share the board link to invite your teammates!',
        icon: '📤',
        target: 'button:has(.lucide-share2)'
    },
    {
        title: 'Export Board',
        description: 'Download your retro as Excel, CSV, PDF or JSON!',
        icon: '💾'
    }
];

// Tour steps for Board page (User)
export const BOARD_TOUR_STEPS_USER = [
    {
        title: 'Welcome! 🎉',
        description: 'This is your team\'s retrospective. Here\'s what you can do!',
        icon: '🙌'
    },
    {
        title: 'See Your Team',
        description: 'Look for the avatars at the top - see who else is online in real-time!',
        icon: '👥'
    },
    {
        title: 'Add Notes',
        description: 'Click + in any column to share your thoughts.',
        icon: '📝'
    },
    {
        title: 'Vote',
        description: 'Click 👍 to vote on notes you agree with!',
        icon: '🗳️'
    },
    {
        title: 'Join Polls',
        description: 'Vote on polls created by your admin. Results show in real-time!',
        icon: '📊'
    },
    {
        title: 'Volume',
        description: 'Adjust timer and music volume with the speaker icons.',
        icon: '🔊'
    }
];

export default Tour;
