import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Check, X, Upload, Loader2 } from 'lucide-react';
import { usePortfolio } from '../../../context/PortfolioContext';
import { uploadImageToImgBB } from '../../../lib/imgbb';

interface EditableImageProps {
  src: string;
  alt: string;
  onSave: (src: string) => void;
  className?: string;
  recommendedSize?: string;
}

export function EditableImage({ src, alt, onSave, className = '', recommendedSize }: EditableImageProps) {
  const { isEditMode } = usePortfolio();
  const [isEditing, setIsEditing] = useState(false);
  const [tempSrc, setTempSrc] = useState(src);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isEditMode) {
    return <img src={src} alt={alt} className={className} />;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const imageUrl = await uploadImageToImgBB(file);
      setTempSrc(imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      
      {!isEditing && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-medium shadow-lg hover:bg-blue-600 transition-colors"
          >
            <ImageIcon size={16} /> Change Image
          </button>
          {recommendedSize && (
            <span className="text-xs font-medium text-white/80 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              Size: {recommendedSize}
            </span>
          )}
        </div>
      )}

      {isEditing && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-20">
          <div className="w-full max-w-md bg-[#111] p-6 rounded-xl border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-slate-400">Update Image</label>
              {recommendedSize && (
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                  Recommended: {recommendedSize}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Upload from device</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg px-4 py-3 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                    {isUploading ? 'Uploading...' : 'Choose Image'}
                  </button>
                </div>
                {uploadError && <p className="text-red-400 text-xs mt-2">{uploadError}</p>}
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">OR</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Image URL</label>
                <input
                  type="text"
                  value={tempSrc}
                  onChange={(e) => setTempSrc(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setTempSrc(src); setIsEditing(false); }}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { onSave(tempSrc); setIsEditing(false); }}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
