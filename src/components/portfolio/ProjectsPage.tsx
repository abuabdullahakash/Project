import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';
import { ArrowRight, ArrowUpRight, Plus, Edit3, Trash2 } from 'lucide-react';
import { usePortfolio, Project } from '../../context/PortfolioContext';
import { ProjectModal } from './editor/ProjectModal';
import { EditableText } from './editor/EditableText';

export function ProjectsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, isEditMode, addProject, updateProject, deleteProject, updatePersonalInfo } = usePortfolio();
  const { projects, services, personalInfo } = data;
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const categories = ['All', ...Array.from(new Set(projects.map(p => p.category)))];

  const filteredProjects = filter === 'All' 
    ? projects 
    : projects.filter(p => p.category === filter);

  const handleAdd = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
    }
  };

  const handleSave = (project: Project) => {
    if (editingProject) {
      updateProject(project.id, project);
    } else {
      addProject(project);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <PortfolioHeader onNavigate={onNavigate} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-20 relative">
            {isEditMode && (
              <button 
                onClick={handleAdd}
                className="absolute -top-12 right-0 bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-medium hover:bg-blue-600 transition-colors shadow-lg"
              >
                <Plus size={16} /> Add New Project
              </button>
            )}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-blue-500 font-semibold tracking-widest uppercase text-sm">
                <EditableText value={personalInfo.projectsPageTitle} onSave={(val) => updatePersonalInfo('projectsPageTitle', val)} />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                <EditableText value={personalInfo.projectsPageHeading1} onSave={(val) => updatePersonalInfo('projectsPageHeading1', val)} /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600"><EditableText value={personalInfo.projectsPageHeading2} onSave={(val) => updatePersonalInfo('projectsPageHeading2', val)} /></span>
              </h1>
              <div className="text-xl text-slate-400 leading-relaxed">
                <EditableText value={personalInfo.projectsPageDescription} onSave={(val) => updatePersonalInfo('projectsPageDescription', val)} multiline />
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  filter === cat 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
            {filteredProjects.map((project, idx) => (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => onNavigate(`/portfolio/project/${project.id}`)}
                className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden cursor-pointer"
              >
                {isEditMode && (
                  <div className="absolute top-6 right-6 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleEdit(e, project)}
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-lg"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold text-blue-400 uppercase tracking-wider">{project.category}</div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <ArrowUpRight size={20} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 group-hover:text-blue-400 transition-colors">{project.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-8 text-lg">{project.shortDescription}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.slice(0, 3).map(tech => (
                      <span key={tech} className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium text-slate-300 border border-white/5">
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium text-slate-300 border border-white/5">
                        +{project.technologies.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Featured Services */}
          <section className="mb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4"><EditableText value={personalInfo.projectsPageServicesTitle} onSave={(val) => updatePersonalInfo('projectsPageServicesTitle', val)} /></h2>
                <p className="text-slate-400 max-w-2xl"><EditableText value={personalInfo.projectsPageServicesSubtitle} onSave={(val) => updatePersonalInfo('projectsPageServicesSubtitle', val)} /></p>
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/services')}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium self-start md:self-auto"
              >
                <EditableText value={personalInfo.projectsPageServicesButton} onSave={(val) => updatePersonalInfo('projectsPageServicesButton', val)} /> <ArrowRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.slice(0, 2).map((service) => (
                <div 
                  key={service.id}
                  onClick={() => onNavigate(`/portfolio/service/${service.id}`)}
                  className="group bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all cursor-pointer"
                >
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-blue-400 transition-colors">{service.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-8">{service.shortDescription}</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    Explore Service <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 rounded-[3rem] p-12 md:p-20 text-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6"><EditableText value={personalInfo.projectsPageCtaTitle} onSave={(val) => updatePersonalInfo('projectsPageCtaTitle', val)} /></h2>
              <div className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                <EditableText value={personalInfo.projectsPageCtaSubtitle} onSave={(val) => updatePersonalInfo('projectsPageCtaSubtitle', val)} multiline />
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/contact')}
                className="bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <EditableText value={personalInfo.projectsPageCtaButton} onSave={(val) => updatePersonalInfo('projectsPageCtaButton', val)} /> <ArrowRight size={20} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <PortfolioFooter />
      <ProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingProject} 
      />
    </div>
  );
}
