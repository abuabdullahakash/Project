import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, LayoutTemplate, Database, Bot, ShoppingCart, Code2, Smartphone, Globe, PenTool, Search, Server, Shield, Zap, Cloud, Cpu } from 'lucide-react';
import { Service } from '../../../context/PortfolioContext';
import { ImageUploadInput } from './ImageUploadInput';

const availableIcons = [
  { name: 'LayoutTemplate', icon: <LayoutTemplate size={20} /> },
  { name: 'Database', icon: <Database size={20} /> },
  { name: 'Bot', icon: <Bot size={20} /> },
  { name: 'ShoppingCart', icon: <ShoppingCart size={20} /> },
  { name: 'Code2', icon: <Code2 size={20} /> },
  { name: 'Smartphone', icon: <Smartphone size={20} /> },
  { name: 'Globe', icon: <Globe size={20} /> },
  { name: 'PenTool', icon: <PenTool size={20} /> },
  { name: 'Search', icon: <Search size={20} /> },
  { name: 'Server', icon: <Server size={20} /> },
  { name: 'Shield', icon: <Shield size={20} /> },
  { name: 'Zap', icon: <Zap size={20} /> },
  { name: 'Cloud', icon: <Cloud size={20} /> },
  { name: 'Cpu', icon: <Cpu size={20} /> },
];

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Service) => void;
  initialData?: Service | null;
}

const defaultService: Service = {
  id: '',
  title: '',
  shortDescription: '',
  fullDescription: '',
  icon: 'LayoutTemplate',
  image: '',
  features: [],
  benefits: [],
  process: []
};

export function ServiceModal({ isOpen, onClose, onSave, initialData }: ServiceModalProps) {
  const [formData, setFormData] = useState<Service>(defaultService);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { ...defaultService, id: Date.now().toString() });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (index: number, field: 'features', value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field: 'features') => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (index: number, field: 'features') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleBenefitChange = (index: number, key: 'title' | 'description', value: string) => {
    setFormData(prev => {
      const newBenefits = [...prev.benefits];
      newBenefits[index] = { ...newBenefits[index], [key]: value };
      return { ...prev, benefits: newBenefits };
    });
  };

  const addBenefit = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, { title: '', description: '' }]
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleProcessChange = (index: number, key: 'step' | 'title' | 'description', value: string) => {
    setFormData(prev => {
      const newProcess = [...prev.process];
      newProcess[index] = { ...newProcess[index], [key]: value };
      return { ...prev, process: newProcess };
    });
  };

  const addProcess = () => {
    setFormData(prev => ({
      ...prev,
      process: [...prev.process, { step: `0${prev.process.length + 1}`, title: '', description: '' }]
    }));
  };

  const removeProcess = (index: number) => {
    setFormData(prev => ({
      ...prev,
      process: prev.process.filter((_, i) => i !== index)
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
          <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit Service' : 'Add New Service'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="service-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">Basic Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                  <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Icon</label>
                  <div className="relative">
                    <select 
                      required 
                      name="icon" 
                      value={formData.icon} 
                      onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))} 
                      className="w-full bg-black border border-white/10 rounded-lg pl-12 pr-4 py-2 text-white focus:border-blue-500 outline-none appearance-none"
                    >
                      <option value="" disabled>Select an icon</option>
                      {availableIcons.map((icon) => (
                        <option key={icon.name} value={icon.name}>{icon.name}</option>
                      ))}
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      {availableIcons.find(i => i.name === formData.icon)?.icon || <LayoutTemplate size={20} />}
                    </div>
                  </div>
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
                <label className="block text-sm font-medium text-slate-400 mb-1">Hero Image URL</label>
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

            {/* What's Included (Features) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xl font-semibold text-white">What's Included (Features)</h3>
                <button type="button" onClick={() => addArrayItem('features')} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                  <Plus size={14} /> Add Feature
                </button>
              </div>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input required type="text" value={feature} onChange={(e) => handleArrayChange(index, 'features', e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="Feature description..." />
                  <button type="button" onClick={() => removeArrayItem(index, 'features')} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* Key Benefits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xl font-semibold text-white">Key Benefits</h3>
                <button type="button" onClick={addBenefit} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                  <Plus size={14} /> Add Benefit
                </button>
              </div>
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 relative">
                  <button type="button" onClick={() => removeBenefit(index)} className="absolute top-4 right-4 text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <div className="pr-8">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                    <input required type="text" value={benefit.title} onChange={(e) => handleBenefitChange(index, 'title', e.target.value)} className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-blue-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                    <textarea required value={benefit.description} onChange={(e) => handleBenefitChange(index, 'description', e.target.value)} rows={2} className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-blue-500 outline-none resize-none text-sm" />
                  </div>
                </div>
              ))}
            </div>

            {/* Our Process */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-xl font-semibold text-white">Our Process</h3>
                <button type="button" onClick={addProcess} className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500/30 transition-colors">
                  <Plus size={14} /> Add Step
                </button>
              </div>
              {formData.process.map((step, index) => (
                <div key={index} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 relative">
                  <button type="button" onClick={() => removeProcess(index)} className="absolute top-4 right-4 text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-4 gap-3 pr-8">
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Step No.</label>
                      <input required type="text" value={step.step} onChange={(e) => handleProcessChange(index, 'step', e.target.value)} className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-blue-500 outline-none text-sm" />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                      <input required type="text" value={step.title} onChange={(e) => handleProcessChange(index, 'title', e.target.value)} className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-blue-500 outline-none text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                    <textarea required value={step.description} onChange={(e) => handleProcessChange(index, 'description', e.target.value)} rows={2} className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white focus:border-blue-500 outline-none resize-none text-sm" />
                  </div>
                </div>
              ))}
            </div>

          </form>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-[#111] rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2 rounded-full font-medium text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="submit" form="service-form" className="bg-blue-500 text-white px-8 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors">
            Save Service
          </button>
        </div>
      </div>
    </div>
  );
}
