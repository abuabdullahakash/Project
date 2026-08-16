import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Camera, Loader2, User, Briefcase, Mail, Phone, 
  MapPin, Globe, Github, Sparkles, Trash2, Link2, 
  CheckCircle2, Shield, Plus, Tag, AlertCircle, Copy, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadImageToImgBB } from '../../lib/imgbb';
import { toast } from 'sonner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_SKILL_SUGGESTIONS = [
  'WordPress', 'Elementor', 'WooCommerce', 'PHP', 'React', 
  'JavaScript', 'Tailwind CSS', 'Next.js', 'Figma', 'MySQL'
];

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { userProfile, user, updateUserProfile, isAdmin } = useAuth();
  const { theme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'skills'>('general');
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [github, setGithub] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or userProfile changes
  useEffect(() => {
    if (isOpen) {
      const currentName = userProfile?.displayName || user?.displayName || '';
      const currentPhoto = userProfile?.photoURL || user?.photoURL || '';
      
      setDisplayName(currentName);
      setPhotoURL(currentPhoto);
      setCustomImageUrl(currentPhoto);
      setTitle(userProfile?.title || 'WordPress & Full-Stack Developer');
      setBio(userProfile?.bio || '');
      setPhone(userProfile?.phone || '');
      setLocation(userProfile?.location || 'Dhaka, Bangladesh');
      setGithub(userProfile?.github || '');
      setPortfolioUrl(userProfile?.portfolioUrl || '');
      setSkills(userProfile?.skills && userProfile.skills.length > 0 
        ? userProfile.skills 
        : ['WordPress', 'Elementor', 'WooCommerce', 'React', 'PHP']
      );
      setActiveTab('general');
      setIsUrlInputOpen(false);
    }
  }, [isOpen, userProfile, user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadImageToImgBB(file);
      if (url) {
        setPhotoURL(url);
        setCustomImageUrl(url);
        toast.success('Photo uploaded successfully!');
      } else {
        toast.error('Failed to upload image. You can also paste an image URL directly.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('An error occurred while uploading the image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customImageUrl.trim()) {
      toast.error('Please enter a valid image URL');
      return;
    }
    setPhotoURL(customImageUrl.trim());
    setIsUrlInputOpen(false);
    toast.success('Profile picture preview updated');
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
    setCustomImageUrl('');
    toast.info('Profile picture cleared. Initial monogram will be used.');
  };

  const handleAddSkill = (skillToAdd: string) => {
    const clean = skillToAdd.trim();
    if (!clean) return;
    if (skills.includes(clean)) {
      toast.warning('Skill already added');
      return;
    }
    if (skills.length >= 15) {
      toast.error('Maximum 15 skills allowed');
      return;
    }
    setSkills([...skills, clean]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!user || !db) {
      toast.error('User authentication is not available');
      return;
    }

    if (!displayName.trim()) {
      toast.error('Please provide a display name');
      return;
    }
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        title: title.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        location: location.trim(),
        github: github.trim(),
        portfolioUrl: portfolioUrl.trim(),
        skills: skills,
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, updateData, { merge: true });
      
      // Update local React context state immediately
      updateUserProfile(updateData);

      toast.success('Profile updated successfully!');
      setIsSaving(false);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save profile changes');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const userInitial = displayName.trim().charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Main Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border my-auto flex flex-col max-h-[92vh] ${
            theme === 'dark' 
              ? 'bg-[#0f172a] border-white/10 shadow-black/80' 
              : 'bg-white border-slate-200 shadow-xl'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                <User size={18} />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Edit Developer Profile
                </h2>
                <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Customize your identity, contact details, and tech stack
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav Tabs */}
          <div className={`px-6 pt-3 pb-0 border-b flex gap-2 shrink-0 ${
            theme === 'dark' ? 'border-white/10 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'general'
                  ? 'border-red-500 text-red-500'
                  : theme === 'dark' ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User size={14} />
              <span>Identity & Bio</span>
            </button>

            <button
              onClick={() => setActiveTab('contact')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'contact'
                  ? 'border-red-500 text-red-500'
                  : theme === 'dark' ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe size={14} />
              <span>Contact & Links</span>
            </button>

            <button
              onClick={() => setActiveTab('skills')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'skills'
                  ? 'border-red-500 text-red-500'
                  : theme === 'dark' ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles size={14} />
              <span>Skills & Stack</span>
              {skills.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'skills' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {skills.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Top Profile Card Showcase (Always Visible) */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center sm:items-start gap-4 ${
              theme === 'dark' ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              {/* Avatar Box with Actions */}
              <div className="relative group shrink-0">
                <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 shadow-xl flex items-center justify-center ${
                  theme === 'dark' ? 'border-red-500/30 bg-slate-900' : 'border-red-500/20 bg-white'
                }`}>
                  {photoURL ? (
                    <img 
                      src={photoURL} 
                      alt={displayName || 'Profile'} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={() => {
                        toast.error('Failed to load image from URL. Restoring default avatar.');
                        setPhotoURL('');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-600 via-rose-600 to-red-700 flex items-center justify-center text-white text-3xl font-extrabold uppercase shadow-inner">
                      {userInitial}
                    </div>
                  )}
                </div>

                {/* Camera Overlay Trigger */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Upload from device"
                  className="absolute -bottom-1.5 -right-1.5 p-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Quick Info & Avatar Management Controls */}
              <div className="flex-1 text-center sm:text-left min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className={`text-base font-extrabold tracking-tight truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {displayName || 'Your Name'}
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Shield size={10} /> Admin
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                </div>

                <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {title || 'Professional Title'}
                </p>

                {/* Avatar Action Pills */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                      theme === 'dark' 
                        ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Camera size={12} className="text-red-500" />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsUrlInputOpen(prev => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                      isUrlInputOpen
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Link2 size={12} className="text-blue-500" />
                    <span>Image URL</span>
                  </button>

                  {photoURL && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 text-red-500 ${
                        theme === 'dark' ? 'bg-red-500/5 hover:bg-red-500/15 border-red-500/20' : 'bg-red-50 hover:bg-red-100 border-red-200'
                      }`}
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Optional URL Paste Box */}
            {isUrlInputOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3 rounded-xl border flex items-center gap-2 ${
                  theme === 'dark' ? 'bg-slate-900 border-blue-500/30' : 'bg-blue-50/50 border-blue-200'
                }`}
              >
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                >
                  Apply
                </button>
              </motion.div>
            )}

            {/* TAB 1: General Info */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <User size={13} className="text-red-500" />
                    <span>Display Name / Full Name *</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white focus:border-red-500 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-red-500 focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                    placeholder="e.g. Akash"
                    required
                  />
                </div>

                {/* Professional Title */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Briefcase size={13} className="text-blue-500" />
                    <span>Professional Role / Headline</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white focus:border-blue-500 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="e.g. WordPress & Full-Stack Developer"
                  />
                </div>

                {/* Bio / Tagline */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-purple-500" />
                      <span>About / Bio Tagline</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{bio.length}/200</span>
                  </label>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all resize-none ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white focus:border-purple-500 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-purple-500 focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    placeholder="Briefly describe your focus, e.g. Building responsive WordPress platforms, custom WooCommerce stores, and AI-powered workflows."
                  />
                </div>

                {/* Email (Readonly Display) */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Mail size={13} className="text-emerald-500" />
                    <span>Account Email</span>
                  </label>
                  <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${
                    theme === 'dark' ? 'bg-white/[0.03] border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <span className="text-xs font-mono truncate">{user?.email || 'Not available'}</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Copy email"
                    >
                      {copiedEmail ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Contact & Social */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                {/* Phone / WhatsApp */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Phone size={13} className="text-emerald-500" />
                    <span>WhatsApp / Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-emerald-500/20`}
                    placeholder="e.g. +880 1700-000000"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <MapPin size={13} className="text-rose-500" />
                    <span>Location / Base</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white focus:border-rose-500 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500 focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-rose-500/20`}
                    placeholder="e.g. Dhaka, Bangladesh (GMT+6)"
                  />
                </div>

                {/* GitHub Profile */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Github size={13} className="text-slate-400" />
                    <span>GitHub Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white focus:border-slate-400 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400 focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-slate-400/20`}
                    placeholder="https://github.com/yourusername"
                  />
                </div>

                {/* Live Portfolio URL */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Globe size={13} className="text-blue-500" />
                    <span>Personal Portfolio / Website</span>
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-white/5 border-white/10 text-white focus:border-blue-500 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="https://yourportfolio.dev"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Skills & Stack */}
            {activeTab === 'skills' && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Tag size={13} className="text-red-500" />
                    <span>Your Active Tech Stack & Skills</span>
                  </label>
                  
                  {/* Skill Badges Cloud */}
                  <div className={`p-4 rounded-2xl border min-h-[90px] flex flex-wrap gap-2 ${
                    theme === 'dark' ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {skills.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No skills added yet. Add from suggestions below or type a custom one.</p>
                    ) : (
                      skills.map(skill => (
                        <span
                          key={skill}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                            theme === 'dark'
                              ? 'bg-red-500/10 text-red-300 border-red-500/30'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:text-red-500 p-0.5 rounded-full"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Custom Skill Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(newSkillInput);
                      }
                    }}
                    placeholder="Type a new skill (e.g. Next.js, Docker)..."
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs font-medium ${
                      theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    } focus:outline-none focus:border-red-500`}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(newSkillInput)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Quick Add Suggestions */}
                <div>
                  <p className={`text-[11px] font-bold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Quick Add Suggestions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                          theme === 'dark' 
                            ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:border-red-500/40' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-red-400'
                        }`}
                      >
                        <Plus size={10} className="text-red-500" />
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
            theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
          }`}>
            <p className={`text-[11px] hidden sm:block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              Changes sync instantly across all modules
            </p>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                  theme === 'dark' ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isUploading}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
