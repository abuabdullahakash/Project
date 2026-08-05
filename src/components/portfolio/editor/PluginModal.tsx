import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { WPPlugin } from '../../../context/PortfolioContext';
import { ImageUploadInput } from './ImageUploadInput';

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plugin: WPPlugin) => void;
  initialData?: WPPlugin | null;
}

const defaultPlugin: WPPlugin = {
  id: '',
  title: '',
  shortDescription: '',
  fullDescription: '',
  activeInstalls: '1,000+',
  rating: '5.0/5',
  image: '',
  liveLink: '',
  wpOrgLink: '',
  downloadLink: '',
  features: []
};

export function PluginModal({ isOpen, onClose, onSave, initialData }: PluginModalProps) {
  const [formData, setFormData] = useState<WPPlugin>(defaultPlugin);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { ...defaultPlugin, id: Date.now().toString() });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev.features];
      newArray[index] = value;
      return { ...prev, features: newArray };
    });
  };

  const addArrayItem = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeArrayItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl my-8 relative flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit Plugin' : 'Add New Plugin'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="plugin-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Basic Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                  <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Active Installations</label>
                  <input required type="text" name="activeInstalls" value={formData.activeInstalls} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. 5,000+" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Rating</label>
                  <input required type="text" name="rating" value={formData.rating} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. 4.9/5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Plugin URL (Website)</label>
                  <input type="text" name="liveLink" value={formData.liveLink} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">WordPress.org Directory URL (Optional)</label>
                  <input type="text" name="wpOrgLink" value={formData.wpOrgLink} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="https://wordpress.org/plugins/..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Download Link / Google Drive Link (Optional)</label>
                  <input type="text" name="downloadLink" value={formData.downloadLink || ''} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="https://drive.google.com/... or direct zip URL" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Short Description (Listing)</label>
                  <textarea required name="shortDescription" value={formData.shortDescription} onChange={handleChange} rows={2} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none" />
                </div>
              </div>
            </div>

            {/* Single Page Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Single Page Details</h3>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Main Banner/Screenshot URL</label>
                <ImageUploadInput 
                  value={formData.image} 
                  onChange={(val) => setFormData(prev => ({ ...prev, image: val }))} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Description (Overview)</label>
                <textarea required name="fullDescription" value={formData.fullDescription} onChange={handleChange} rows={4} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none" />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xl font-semibold text-white">Features List</h3>
                <button type="button" onClick={addArrayItem} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                  <Plus size={14} /> Add Feature
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input required type="text" value={feature} onChange={(e) => handleArrayChange(index, e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. Fully responsive templates" />
                    <button type="button" onClick={() => removeArrayItem(index)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </form>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-[#111] rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2 rounded-full font-medium text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="submit" form="plugin-form" className="bg-blue-500 text-white px-8 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors">
            Save Plugin
          </button>
        </div>
      </div>
    </div>
  );
}
