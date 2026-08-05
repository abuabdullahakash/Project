import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { Testimonial } from '../../../context/PortfolioContext';
import { ImageUploadInput } from './ImageUploadInput';

interface TestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testimonial: Testimonial) => void;
  initialData?: Testimonial | null;
}

const defaultTestimonial: Testimonial = {
  id: '',
  name: '',
  role: '',
  company: '',
  feedback: '',
  rating: 5,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200'
};

export function TestimonialModal({ isOpen, onClose, onSave, initialData }: TestimonialModalProps) {
  const [formData, setFormData] = useState<Testimonial>(defaultTestimonial);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { ...defaultTestimonial, id: Date.now().toString() });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl my-8 relative flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit Testimonial' : 'Add New Testimonial'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="testimonial-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Client Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. Sarah Jenkins" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Client Role / Designation</label>
                <input required type="text" name="role" value={formData.role} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. E-commerce Founder" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Company (Optional)</label>
                <input type="text" name="company" value={formData.company || ''} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. The Trend Room" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    className="text-slate-400 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={28}
                      className={`${
                        star <= (formData.rating || 5)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Client Avatar / Profile Photo URL</label>
              <ImageUploadInput 
                value={formData.avatar || ''} 
                onChange={(val) => setFormData(prev => ({ ...prev, avatar: val }))} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Client Feedback</label>
              <textarea 
                required 
                name="feedback" 
                value={formData.feedback} 
                onChange={handleChange} 
                rows={4} 
                maxLength={400}
                placeholder="Write the client feedback here..."
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none" 
              />
              <div className="text-right text-xs text-slate-500 mt-1">
                {formData.feedback.length}/400 characters
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0 bg-[#111] rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2 rounded-full font-medium text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="submit" form="testimonial-form" className="bg-blue-500 text-white px-8 py-2 rounded-full font-medium hover:bg-blue-600 transition-colors">
            Save Testimonial
          </button>
        </div>
      </div>
    </div>
  );
}
