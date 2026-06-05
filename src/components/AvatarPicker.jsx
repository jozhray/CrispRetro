import React, { useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from './Toast';

export const EMOJI_AVATARS = ['👾', '🤖', '👽', '👻', '🐶', '🦊', '🐱', '🐯', '🐼', '🐨', '🐸', '🦄', '🦉', '😎', '🤠'];

const AvatarPicker = ({ avatar, setAvatar, className = '' }) => {
    const fileInputRef = useRef(null);
    const toast = useToast();

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

    return (
        <div className={`space-y-3 ${className}`}>
            <label className="text-xs text-gray-500 font-medium px-1 uppercase tracking-wider">Choose Avatar</label>
            <div className="flex flex-wrap gap-2">
                {/* Upload Button */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isBase64 ? 'border-cyan-400 bg-cyan-500/20' : 'border-gray-600 bg-slate-800 hover:border-gray-500'}`}
                    title="Upload Photo"
                >
                    {isBase64 ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <Upload size={16} className="text-gray-400" />
                    )}
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />

                {/* Emojis */}
                {EMOJI_AVATARS.map(emoji => (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(emoji)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${avatar === emoji ? 'bg-cyan-500/20 border-2 border-cyan-400 scale-110' : 'bg-slate-800 border-2 border-transparent hover:border-gray-600 hover:scale-105'}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AvatarPicker;
