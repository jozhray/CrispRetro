import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from './Toast';

const AVATAR_CATEGORIES = {
    'Faces': [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉',
        '😊', '😇', '🥰', '😍', '🤩', '😎', '🤓', '🧐', '🤠', '🥳',
        '😏', '😌', '🤗', '🤔', '🫡', '🤐', '🤨', '😶', '🫥', '😬',
    ],
    'People': [
        '👶', '🧒', '👦', '👧', '🧑', '👩', '👨', '🧔', '👩‍🦰', '👨‍🦱',
        '👩‍🦳', '🧓', '👴', '👵', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜',
        '🧝', '🧞', '🧟', '🥷', '🫅', '🤴', '👸', '🎅', '🤶', '💂',
    ],
    'Animals': [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
        '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅',
        '🦉', '🦄', '🐴', '🐝', '🐛', '🦋', '🐢', '🐙', '🦈', '🐬',
    ],
    'Fantasy': [
        '👾', '🤖', '👽', '👻', '💀', '☠️', '👿', '😈', '🎃', '🫠',
    ],
};

export const EMOJI_AVATARS = Object.values(AVATAR_CATEGORIES).flat();

const AvatarPicker = ({ avatar, setAvatar, className = '' }) => {
    const fileInputRef = useRef(null);
    const toast = useToast();
    const [activeCategory, setActiveCategory] = useState('Faces');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 100;
                const MAX_HEIGHT = 100;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to WebP or JPEG
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                setAvatar(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const isBase64 = avatar?.startsWith('data:image');
    const categories = Object.keys(AVATAR_CATEGORIES);

    return (
        <div className={`space-y-3 ${className}`}>
            <label className="text-xs text-gray-500 font-medium px-1 uppercase tracking-wider">Choose Avatar</label>

            {/* Upload Photo Button */}
            <div className="flex items-center gap-3 pb-2 border-b border-gray-700/50">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${isBase64 ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-gray-600 bg-slate-800 hover:border-gray-500 text-gray-400 hover:text-gray-300'}`}
                    title="Upload Photo"
                >
                    {isBase64 ? (
                        <img src={avatar} alt="Avatar" className="w-7 h-7 object-cover rounded-full" />
                    ) : (
                        <Upload size={16} />
                    )}
                    <span>{isBase64 ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700">
                {categories.map(cat => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800/60 text-gray-400 border border-transparent hover:text-gray-300 hover:bg-slate-700/60'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-8 gap-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700">
                {AVATAR_CATEGORIES[activeCategory].map(emoji => (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(emoji)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all ${avatar === emoji
                            ? 'bg-cyan-500/20 border-2 border-cyan-400 scale-110 shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-800/60 border border-transparent hover:border-gray-600 hover:scale-105 hover:bg-slate-700/60'
                        }`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AvatarPicker;
