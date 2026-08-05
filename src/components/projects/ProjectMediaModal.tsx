import React, { useState, useEffect, useMemo } from 'react';
import { Project } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { uploadImageToImgBB } from '../../lib/imgbb';
import { X, Image as ImageIcon, Star, Globe, Plus, Trash2, Loader, Check } from 'lucide-react';

interface ProjectMediaModalProps {
  project: Project;
  onClose: () => void;
  onUpdate: (updates: Partial<Project>) => void;
}

export function ProjectMediaModal({ project, onClose, onUpdate }: ProjectMediaModalProps) {
  const { theme } = useTheme();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [isEditingLiveDemo, setIsEditingLiveDemo] = useState(false);
  const [liveDemoInput, setLiveDemoInput] = useState(project.liveDemoUrl || '');
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const pastedImageUrl = useMemo(() => pastedImage ? URL.createObjectURL(pastedImage) : '', [pastedImage]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) setPastedImage(file);
          break;
        }
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          setPastedImage(file);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  const handleUploadPasted = async (type: 'review' | 'gallery') => {
    if (!pastedImage) return;
    const file = pastedImage;
    setPastedImage(null);

    if (type === 'review') {
      setUploadingImage(true);
      try {
        const url = await uploadImageToImgBB(file);
        if (url) {
          onUpdate({ reviewScreenshotUrl: url });
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image.");
      } finally {
        setUploadingImage(false);
      }
    } else {
      setUploadingGalleryImage(true);
      try {
        const url = await uploadImageToImgBB(file);
        if (url) {
          const updatedGallery = [...(project.projectGalleryUrls || []), url];
          onUpdate({ projectGalleryUrls: updatedGallery });
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image.");
      } finally {
        setUploadingGalleryImage(false);
      }
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const url = await uploadImageToImgBB(file);
      if (url) {
        onUpdate({ reviewScreenshotUrl: url });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingGalleryImage(true);
    try {
      const url = await uploadImageToImgBB(file);
      if (url) {
        const updatedGallery = [...(project.projectGalleryUrls || []), url];
        onUpdate({ projectGalleryUrls: updatedGallery });
      }
    } catch (error) {
      console.error("Error uploading gallery image:", error);
      alert("Failed to upload image to gallery.");
    } finally {
      setUploadingGalleryImage(false);
    }
  };

  const handleRemoveGalleryImage = (urlToRemove: string) => {
    const updatedGallery = (project.projectGalleryUrls || []).filter(url => url !== urlToRemove);
    onUpdate({ projectGalleryUrls: updatedGallery });
  };

  const handleSaveLiveDemo = () => {
    onUpdate({ liveDemoUrl: liveDemoInput });
    setIsEditingLiveDemo(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-[#0f111a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-md ${theme === 'dark' ? 'border-white/5 bg-[#0f111a]/80' : 'border-slate-100 bg-white/80'}`}>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ImageIcon className="text-emerald-500" size={24} />
              Project Media
            </h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
              Manage screenshots and live demo link for this delivered project
            </p>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Live Demo URL */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Globe size={14} /> Live Demo URL
            </h3>
            
            {isEditingLiveDemo ? (
              <div className="flex items-center gap-2">
                <input 
                  type="url"
                  value={liveDemoInput}
                  onChange={(e) => setLiveDemoInput(e.target.value)}
                  placeholder="https://example.com"
                  className={`flex-1 px-4 py-2.5 text-sm rounded-xl border focus:outline-none transition-colors ${
                    theme === 'dark' 
                      ? 'bg-black/50 border-white/10 text-white focus:border-blue-500/50' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                  autoFocus
                />
                <button 
                  onClick={handleSaveLiveDemo}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg ${
                    theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  Save
                </button>
                <button 
                  onClick={() => { setLiveDemoInput(project.liveDemoUrl || ''); setIsEditingLiveDemo(false); }}
                  className={`p-2.5 rounded-xl transition-colors ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {project.liveDemoUrl ? (
                  <div className={`flex-1 flex items-center justify-between p-3 rounded-xl border ${theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-sm font-medium truncate">{project.liveDemoUrl}</span>
                    <div className="flex gap-2">
                      <a 
                        href={project.liveDemoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                      >
                        <Globe size={14} />
                      </a>
                      <button 
                        onClick={() => setIsEditingLiveDemo(true)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditingLiveDemo(true)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed transition-all ${
                      theme === 'dark' ? 'border-white/20 text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/5' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Plus size={14} /> Add Live Demo URL
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Review Screenshot */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex justify-between items-center">
                <span className="flex items-center gap-2"><Star size={14} /> Client Review</span>
              </h3>
              
              <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                {project.reviewScreenshotUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/20">
                      <img src={project.reviewScreenshotUrl} alt="Review Screenshot" className="w-full h-full object-cover" />
                    </div>
                    <label className={`cursor-pointer flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-dashed ${
                      theme === 'dark' ? 'border-white/20 text-gray-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}>
                      {uploadingImage ? <Loader size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                      {uploadingImage ? 'Uploading...' : 'Replace Screenshot'}
                      <input type="file" accept="image/*" onChange={handleScreenshotUpload} disabled={uploadingImage} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4 min-h-[140px]">
                    <Star size={24} className={`mb-2 opacity-30 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} />
                    <p className="text-xs opacity-50 mb-4 px-4">Upload or paste (Ctrl+V) a screenshot of the client's review.</p>
                    <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                      theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}>
                      {uploadingImage ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                      Upload Review
                      <input type="file" accept="image/*" onChange={handleScreenshotUpload} disabled={uploadingImage} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Screenshots */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex justify-between items-center">
                <span className="flex items-center gap-2"><ImageIcon size={14} /> Project Gallery</span>
              </h3>
              
              <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(project.projectGalleryUrls || []).map((url, index) => (
                    <div key={index} className="group relative rounded-xl overflow-hidden border border-white/10 aspect-square bg-black/20">
                      <img src={url} alt={`Gallery image ${index + 1}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => handleRemoveGalleryImage(url)}
                        className="absolute top-1 right-1 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  <label className={`cursor-pointer flex flex-col items-center justify-center aspect-square rounded-xl border border-dashed transition-all ${
                    theme === 'dark' ? 'border-white/20 hover:bg-white/5 text-gray-400' : 'border-slate-300 hover:bg-slate-100 text-slate-500'
                  }`}>
                    {uploadingGalleryImage ? (
                      <Loader size={20} className="animate-spin" />
                    ) : (
                      <><Plus size={20} className="mb-1" /><span className="text-[10px] uppercase font-bold tracking-widest">Add Image</span></>
                    )}
                    <input type="file" accept="image/*" onChange={handleGalleryUpload} disabled={uploadingGalleryImage} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-center opacity-50 uppercase tracking-widest">Upload or paste (Ctrl+V) project screenshots</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pasted Image Modal */}
      {pastedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl ${theme === 'dark' ? 'bg-[#0f111a] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Image Pasted!</h3>
              <button onClick={() => setPastedImage(null)} className={`p-1.5 rounded-full ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                <X size={16} />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden mb-6 border border-white/5 bg-black/5 aspect-video flex items-center justify-center">
              <img src={pastedImageUrl} alt="Pasted preview" className="max-w-full max-h-full object-contain" />
            </div>
            <p className={`text-xs font-medium mb-4 text-center uppercase tracking-widest ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Where to save this image?</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleUploadPasted('gallery')}
                className={`w-full py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-lg flex items-center justify-center gap-2 ${
                  theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploadingGalleryImage ? <Loader size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                {uploadingGalleryImage ? 'Uploading...' : 'Project Gallery'}
              </button>
              <button 
                onClick={() => handleUploadPasted('review')}
                className={`w-full py-2.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 border ${
                  theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900'
                }`}
              >
                {uploadingImage ? <Loader size={14} className="animate-spin" /> : <Star size={14} />}
                {uploadingImage ? 'Uploading...' : 'Review Screenshot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
