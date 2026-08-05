import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';

export function ProjectDetails({ id, onBack }: { id: string, onBack: () => void }) {
  const { data } = usePortfolio();
  const project = data.projects.find(p => p.id === id);
  const relatedProjects = data.projects.filter(p => p.id !== id).slice(0, 2);

  if (!project) return <div className="p-20 text-center text-white">Project not found.</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <PortfolioHeader onNavigate={(path) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <button onClick={() => {
              window.history.pushState({}, '', '/portfolio');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }} className="hover:text-white transition-colors">Home</button>
            <ChevronRight size={14} />
            <button onClick={() => {
              window.history.pushState({}, '', '/portfolio/projects');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }} className="hover:text-white transition-colors">Projects</button>
            <ChevronRight size={14} />
            <span className="text-white">{project.title}</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="text-blue-500 font-semibold tracking-widest uppercase text-sm mb-4">
              {project.category}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.1]">
              {project.title}
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 leading-relaxed max-w-3xl">
              {project.shortDescription}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="aspect-video rounded-3xl overflow-hidden border border-white/10 mb-16"
          >
            <img src={project.image} alt={project.title} className="w-full h-full object-cover" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
            <div className="md:col-span-2 space-y-16">
              {/* Overview */}
              <section>
                <h2 className="text-3xl font-bold tracking-tight mb-6">Project Overview</h2>
                <p className="text-lg text-slate-300 leading-relaxed">
                  {project.fullDescription}
                </p>
              </section>

              {/* Challenge & Solution */}
              {(project.challenge || project.solution) && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {project.challenge && (
                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                      <h3 className="text-xl font-bold mb-4 text-white">The Challenge</h3>
                      <p className="text-slate-400 leading-relaxed">{project.challenge}</p>
                    </div>
                  )}
                  {project.solution && (
                    <div className="bg-blue-500/10 p-8 rounded-3xl border border-blue-500/20">
                      <h3 className="text-xl font-bold mb-4 text-blue-400">The Solution</h3>
                      <p className="text-slate-300 leading-relaxed">{project.solution}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Results */}
              {project.results && (
                <section>
                  <h2 className="text-3xl font-bold tracking-tight mb-8">Key Results</h2>
                  <div className="space-y-4">
                    {project.results.map((result, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
                        <CheckCircle2 className="text-blue-400 shrink-0 mt-1" size={24} />
                        <p className="text-lg text-slate-300">{result}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10 sticky top-28">
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Client</h3>
                  <p className="text-lg font-medium text-white">{project.client}</p>
                </div>
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map(tech => (
                      <span key={tech} className="px-3 py-1.5 rounded-full bg-white/10 text-sm font-medium text-slate-300 border border-white/5">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <a 
                    href={project.liveLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Visit Live Site <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="space-y-8 mb-20">
            <h2 className="text-3xl font-bold tracking-tight">Project Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {project.gallery.map((img, i) => (
                <div key={i} className="aspect-video rounded-3xl overflow-hidden border border-white/10">
                  <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
              ))}
            </div>
          </div>

          {/* Related Projects */}
          <section className="pt-20 border-t border-white/10">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold tracking-tight">More Projects</h2>
              <button onClick={onBack} className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-medium transition-colors">
                View All <ArrowRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedProjects.map((relatedProject) => (
                <div 
                  key={relatedProject.id}
                  className="group relative aspect-video rounded-3xl overflow-hidden cursor-pointer"
                  onClick={() => {
                    window.history.pushState({}, '', `/portfolio/project/${relatedProject.id}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
                  <img 
                    src={relatedProject.image} 
                    alt={relatedProject.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="text-sm font-medium text-blue-400 mb-2">{relatedProject.category}</div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">{relatedProject.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <PortfolioFooter />
    </div>
  );
}
