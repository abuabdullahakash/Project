import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Download, Trash2, Search, Filter, Image as ImageIcon, FileJson, Plus, X, Loader2, ExternalLink } from 'lucide-react';
import { useElementorTemplates } from '../../hooks/useElementorTemplates';
import { useTheme } from '../../context/ThemeContext';
import { ElementorTemplate } from '../../types';

const CATEGORIES = ['Header', 'Footer', 'Hero Section', 'Landing Page', 'Contact Section', 'About Section', 'Services Section', 'Other'];

export function TemplateLibrary() {
  const { theme } = useTheme();
  const { templates, loading, uploadTemplate, deleteTemplate } = useElementorTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const dynamicCategories = Array.from(new Set([...CATEGORIES, ...templates.map(t => t.category)])).sort();

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = async (template: ElementorTemplate) => {
    try {
      const blob = new Blob([template.jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.title.replace(/\s+/g, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Elementor Templates
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage and reuse your Elementor JSON templates.
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-500 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
        >
          <Upload size={18} />
          Upload Template
        </button>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 ${
        theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`} size={18} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${
              theme === 'dark' 
                ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
        </div>
        <div className="relative w-full md:w-64">
          <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`} size={18} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm appearance-none ${
              theme === 'dark' 
                ? 'bg-black/50 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50' 
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
            }`}
          >
            <option value="All">All Categories</option>
            {dynamicCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className={`text-center py-20 rounded-3xl border border-dashed ${
          theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-300 bg-slate-50'
        }`}>
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
            theme === 'dark' ? 'bg-white/5 text-slate-400' : 'bg-slate-200 text-slate-500'
          }`}>
            <FileJson size={32} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No templates found</h3>
          <p className={`text-sm max-w-sm mx-auto ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {searchQuery || selectedCategory !== 'All' 
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Upload your first Elementor JSON template to start building your library."}
          </p>
          {(!searchQuery && selectedCategory === 'All') && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-6 text-blue-500 font-medium hover:text-blue-400 transition-colors"
            >
              Upload Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map(template => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group rounded-2xl overflow-hidden border transition-all hover:shadow-xl ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 hover:border-white/20' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Screenshot Area */}
              <div className={`aspect-video relative flex items-center justify-center overflow-hidden border-b ${
                theme === 'dark' ? 'bg-black/50 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}>
                {template.screenshotUrl ? (
                  <img 
                    src={template.screenshotUrl} 
                    alt={template.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <ImageIcon size={32} className="opacity-50" />
                    <span className="text-xs font-medium uppercase tracking-wider opacity-50">No Preview</span>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                    theme === 'dark' ? 'bg-black/50 text-white border-white/10' : 'bg-white/80 text-slate-900 border-slate-200'
                  }`}>
                    {template.category}
                  </span>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-5">
                <h3 className={`font-semibold text-lg mb-4 truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} title={template.title}>
                  {template.title}
                </h3>
                
                <div className="flex items-center gap-2">
                  {template.liveUrl && (
                    <a
                      href={template.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-xl transition-colors ${
                        theme === 'dark' 
                          ? 'bg-white/5 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-white/5' 
                          : 'bg-slate-50 text-blue-500 hover:bg-blue-50 border border-slate-200'
                      }`}
                      title="Live Preview"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDownload(template)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this template?')) {
                        deleteTemplate(template);
                      }
                    }}
                    className={`p-2.5 rounded-xl transition-colors ${
                      theme === 'dark' 
                        ? 'bg-white/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-white/5' 
                        : 'bg-slate-50 text-red-500 hover:bg-red-50 border border-slate-200'
                    }`}
                    title="Delete Template"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onUpload={uploadTemplate}
      />
    </div>
  );
}

function UploadModal({ isOpen, onClose, onUpload }: { 
  isOpen: boolean; 
  onClose: () => void;
  onUpload: (title: string, category: string, jsonContent: string, screenshotFile?: File, liveUrl?: string) => Promise<any>;
}) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonContent, setJsonContent] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file.');
    }
  };

  const processJsonFile = (file: File) => {
    if (file.name.endsWith('.json')) {
      setJsonFile(file);
      if (!title) {
        // Auto-fill title from filename if empty
        setTitle(file.name.replace('.json', '').replace(/[-_]/g, ' '));
      }
      
      // Read the file content
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setJsonContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid JSON file.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processJsonFile(file);
  };

  const handleJsonDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingJson(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processJsonFile(file);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) processImageFile(file);
          break; // Only take the first image
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !jsonFile || !jsonContent) return;
    
    const finalCategory = category === 'Custom' ? customCategory : category;
    if (!finalCategory) {
      alert('Please select or enter a category.');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(title, finalCategory, jsonContent, screenshotFile || undefined, liveUrl || undefined);
      // Reset and close
      setTitle('');
      setCategory(CATEGORIES[0]);
      setCustomCategory('');
      setLiveUrl('');
      setJsonFile(null);
      setJsonContent('');
      setScreenshotFile(null);
      setScreenshotPreview(null);
      onClose();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload template. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isUploading ? onClose : undefined}
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border ${
          theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className={`px-6 py-4 border-b flex justify-between items-center ${
          theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
        }`}>
          <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Upload Template
          </h2>
          <button 
            onClick={onClose}
            disabled={isUploading}
            className={`p-2 rounded-full transition-colors ${
              theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* JSON File Upload */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Elementor JSON File *
            </label>
            <div 
              onClick={() => jsonInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingJson(true); }}
              onDragLeave={() => setIsDraggingJson(false)}
              onDrop={handleJsonDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDraggingJson
                  ? 'border-blue-500 bg-blue-500/10'
                  : jsonFile 
                    ? (theme === 'dark' ? 'border-blue-500/50 bg-blue-500/5' : 'border-blue-500 bg-blue-50')
                    : (theme === 'dark' ? 'border-white/20 hover:border-white/40 bg-white/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50')
              }`}
            >
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={jsonInputRef}
                onChange={handleJsonChange}
              />
              {jsonFile ? (
                <div className="flex flex-col items-center gap-2 text-blue-500">
                  <FileJson size={32} />
                  <span className="font-medium text-sm">{jsonFile.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload size={32} />
                  <span className="font-medium text-sm">Click or drag & drop JSON file</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Template Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hero Section V1"
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${
                  theme === 'dark' 
                    ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm appearance-none ${
                  theme === 'dark' 
                    ? 'bg-black/50 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/50' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Custom">Custom...</option>
              </select>
              {category === 'Custom' && (
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className={`w-full mt-3 px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${
                    theme === 'dark' 
                      ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
              )}
            </div>
          </div>

          {/* Live URL Input */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Live Preview URL (Optional)
            </label>
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://your-website.com/page"
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm ${
                theme === 'dark' 
                  ? 'bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/50' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Preview Image (Optional)
            </label>
            <div 
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={handleImageDrop}
              className={`border-2 border-dashed rounded-xl overflow-hidden text-center cursor-pointer transition-colors relative aspect-video flex items-center justify-center ${
                isDraggingImage
                  ? 'border-blue-500 bg-blue-500/10'
                  : screenshotPreview 
                    ? 'border-transparent'
                    : (theme === 'dark' ? 'border-white/20 hover:border-white/40 bg-white/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50')
              }`}
            >
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={imageInputRef}
                onChange={handleImageChange}
              />
              {screenshotPreview ? (
                <>
                  <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium text-sm flex items-center gap-2">
                      <ImageIcon size={16} /> Change Image
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 px-4">
                  <ImageIcon size={32} />
                  <span className="font-medium text-sm">Click, drag & drop, or paste image</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                theme === 'dark' 
                  ? 'text-slate-300 hover:bg-white/10' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || !jsonFile || isUploading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Save Template
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
