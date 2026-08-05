import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Project } from '../../../context/PortfolioContext';
import { ImageUploadInput } from './ImageUploadInput';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  initialData?: Project | null;
}

const defaultProject: Project = {
  id: '',
  title: '',
  category: '',
  shortDescription: '',
  fullDescription: '',
  challenge: '',
  solution: '',
  results: [],
  image: '',
  gallery: [],
  technologies: [],
  liveLink: '',
  client: ''
};

export function ProjectModal({ isOpen, onClose, onSave, initialData }: ProjectModalProps) {
  const [formData, setFormData] = useState<Project>(defaultProject);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { ...defaultProject, id: Date.now().toString() });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (index: number, field: 'results' | 'gallery' | 'technologies', value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field: 'results' | 'gallery' | 'technologies') => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (index: number, field: 'results' | 'gallery' | 'technologies') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
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
          <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit Project' : 'Add New Project'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Basic Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                  <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                  <input required type="text" name="category" value={formData.category} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Client Name</label>
                  <input required type="text" name="client" value={formData.client} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Live Link URL</label>
                  <input type="text" name="liveLink" value={formData.liveLink} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="https://" />
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
                <label className="block text-sm font-medium text-slate-400 mb-1">Main Image URL</label>
                <ImageUploadInput 
                  value={formData.image} 
                  onChange={(val) => setFormData(prev => ({ ...prev, image: val }))} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Description (Overview)</label>
                <textarea required name="fullDescription" value={formData.fullDescription} onChange={handleChange} rows={4} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">The Challenge</label>
                <textarea required name="challenge" value={formData.challenge} onChange={handleChange} rows={3} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">The Solution</label>
                <textarea required name="solution" value={formData.solution} onChange={handleChange} rows={3} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none" />
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xl font-semibold text-white">Results</h3>
                <button type="button" onClick={() => addArrayItem('results')} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                  <Plus size={14} /> Add Result
                </button>
              </div>
              {formData.results.map((result, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input required type="text" value={result} onChange={(e) => handleArrayChange(index, 'results', e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="Result description..." />
                  <button type="button" onClick={() => removeArrayItem(index, 'results')} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* Technologies */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xl font-semibold text-white">Technologies Used</h3>
                <button type="button" onClick={() => addArrayItem('technologies')} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                  <Plus size={14} /> Add Tech
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {formData.technologies.map((tech, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input required type="text" value={tech} onChange={(e) => handleArrayChange(index, 'technologies', e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. React" />
                    <button type="button" onClick={() => removeArrayItem(index, 'technologies')} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xl font-semibold text-white">Gallery Images</h3>
                <button type="button" onClick={() => addArrayItem('gallery')} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                  <Plus size={14} /> Add Image
                </button>
              </div>
              {formData.gallery.map((img, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <ImageUploadInput 
                      value={img} 
                      onChange={(val) => handleArrayChange(index, 'gallery', val)} 
                    />
                  </div>
                  <button type="button" onClick={() => removeArrayItem(index, 'gallery')} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

          </form>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-[#111] rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2 rounded-full font-medium text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="submit" form="project-form" className="bg-blue-500 text-white px-8 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors">
            Save Project
          </button>
        </div>
      </div>
    </div>
  );
}
