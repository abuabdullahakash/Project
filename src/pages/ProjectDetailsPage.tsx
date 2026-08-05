import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Clock, Link as LinkIcon, Star, Image as ImageIcon, CheckCircle2, Shield, Loader, Key, ExternalLink, Globe } from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

interface ProjectDetailsPageProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetailsPage({ projectId, onBack }: ProjectDetailsPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchProject = async () => {
      if (!db || !projectId) return;
      try {
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        }
      } catch (error) {
        console.error("Error fetching project details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-20 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
        <Loader className="w-10 h-10 animate-spin mb-4" />
        <p>Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`flex flex-col items-center justify-center p-20 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
        <p>Project not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Go Back</button>
      </div>
    );
  }

  return (
    <div className={`p-8 w-full max-w-7xl mx-auto min-h-screen ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      <button 
        onClick={onBack}
        className={`flex items-center gap-2 mb-8 transition-colors ${
          theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Header Info */}
          <div className={`p-8 rounded-3xl border shadow-xl ${
            theme === 'dark' ? 'bg-[#0f111a]/80 border-emerald-500/20' : 'bg-white border-emerald-100'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6 mb-6">
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 
                    className="text-2xl md:text-3xl font-bold tracking-tight break-words" 
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    {project.title}
                  </h1>
                  
                  {project.projectType === 'personal' && (
                    <span className="shrink-0 px-3 py-1 bg-purple-500/10 text-purple-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-purple-500/20 flex items-center gap-1.5 mt-1 md:mt-0">
                      Personal
                    </span>
                  )}

                  <span className="shrink-0 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1.5 mt-1 md:mt-0">
                    <CheckCircle2 size={12} />
                    Delivered
                  </span>
                </div>
                {project.projectType !== 'personal' && (
                  <>
                    <p className={`text-lg font-medium truncate ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>{project.clientName}</p>
                    {project.clientEmail && (
                      <p className={`text-sm mt-1 truncate ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>{project.clientEmail}</p>
                    )}
                  </>
                )}
                
                {/* Live Demo Section */}
                {project.liveDemoUrl && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <a 
                        href={project.liveDemoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          theme === 'dark' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                        }`}
                      >
                        <Globe size={16} /> View Live Demo
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-left md:text-right w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-white/10 md:border-transparent">
                {project.projectType !== 'personal' && (
                  <p className="text-3xl md:text-4xl font-light">${project.price || 0}</p>
                )}
                {project.deliveredAt && (
                  <p className={`text-xs mt-1 md:mt-2 uppercase tracking-wider font-bold ${theme === 'dark' ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
                    Delivered on: {new Date(project.deliveredAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {project.description && (
              <div className={`p-5 rounded-2xl mb-6 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3 opacity-50">Project Description</h3>
                <p className="leading-relaxed opacity-90">{project.description}</p>
              </div>
            )}

            {/* Client Rating */}
            {project.clientRating !== undefined && project.clientRating > 0 && (
              <div className={`flex items-center gap-4 p-5 rounded-2xl ${
                theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'
              }`}>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const rating = project.clientRating || 0;
                    const fillPercentage = Math.max(0, Math.min(100, (rating - star + 1) * 100));
                    return (
                      <div key={star} className="relative w-6 h-6">
                        <Star size={24} className={`${theme === 'dark' ? 'text-white/10' : 'text-amber-200'} absolute inset-0`} />
                        <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
                          <Star size={24} className="text-amber-500" fill="currentColor" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className="text-xl font-bold font-mono text-amber-500">{project.clientRating.toFixed(1)} / 5.0</span>
              </div>
            )}
            
            {/* Restricted credentials warning */}
            <div className={`mt-8 flex items-center justify-center p-4 rounded-xl border ${theme === 'dark' ? 'bg-black/50 border-white/5' : 'bg-slate-50 border-slate-100'} text-center gap-3 opacity-75`}>
               <Shield size={16} className={theme === 'dark' ? 'text-gray-500' : 'text-slate-400'} />
               <p className={`text-xs uppercase tracking-widest font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Credentials and access data are hidden</p>
            </div>
          </div>
          
          {/* Notes read-only */}
          {project.notes && project.notes.length > 0 && (
            <div className={`p-8 rounded-3xl border shadow-xl ${
              theme === 'dark' ? 'bg-[#0f111a]/80 border-white/5' : 'bg-white border-slate-100'
            }`}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-6 opacity-50">Project Notes</h3>
              <div className="space-y-4">
                {project.notes.map((note) => (
                  <div key={note.id} className={`p-4 border rounded-2xl ${
                    theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <p className="text-sm opacity-90 line-clamp-3">{note.content}</p>
                    <div className="flex justify-end mt-3 opacity-50">
                      <Clock size={12} className="mr-1" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">{formatRelativeTime(note.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Gallery */}
          {project.projectGalleryUrls && project.projectGalleryUrls.length > 0 && (
            <div className={`p-8 rounded-3xl border shadow-xl ${
              theme === 'dark' ? 'bg-[#0f111a]/80 border-white/5' : 'bg-white border-slate-100'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 flex gap-2 items-center">
                  <ImageIcon size={14} />
                  <span>Project Gallery Screenshots</span>
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {project.projectGalleryUrls.map((url, index) => (
                  <div key={index} className="group relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/20">
                    <img src={url} alt={`Gallery image ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
                        title="View Full Size"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Review Screenshot & External Links */}
        <div className="space-y-8">
          {project.reviewScreenshotUrl && (
            <div className={`p-8 rounded-3xl border shadow-xl flex flex-col ${
              theme === 'dark' ? 'bg-[#0f111a]/80 border-white/5' : 'bg-white border-slate-100'
            }`}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-6 opacity-50 flex justify-between items-center">
                <span>Client Review Screenshot</span>
                <ImageIcon size={14} />
              </h3>
              
              <div className="space-y-6">
                <a href={project.reviewScreenshotUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden shadow-lg border border-white/10 hover:border-white/30 transition-all">
                  <img src={project.reviewScreenshotUrl} alt="Review Screenshot" className="w-full object-cover" />
                </a>
              </div>
            </div>
          )}
          
          {/* External Links */}
          {project.additionalLinks && project.additionalLinks.length > 0 && (
            <div className={`p-8 rounded-3xl border shadow-xl ${
              theme === 'dark' ? 'bg-[#0f111a]/80 border-white/5' : 'bg-white border-slate-100'
            }`}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-6 opacity-50 flex gap-2 items-center">
                 <LinkIcon size={14} />
                 <span>Resources</span>
              </h3>
              <div className="space-y-3">
                {project.additionalLinks.map((link) => (
                  <a 
                    key={link.id} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{link.title}</span>
                    <ExternalLink size={14} className="opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

