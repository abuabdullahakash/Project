import React, { useState, useRef } from 'react';
import { Upload, Loader2, Link } from 'lucide-react';
import { uploadImageToImgBB } from '../../../lib/imgbb';

interface ImageUploadInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ImageUploadInput({ value, onChange, placeholder = "https://...", className = "" }: ImageUploadInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const imageUrl = await uploadImageToImgBB(file);
      onChange(imageUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Link size={16} className="text-slate-500" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 outline-none"
            placeholder={placeholder}
          />
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg px-4 py-2 text-white transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
        >
          {isUploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload'}</span>
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
