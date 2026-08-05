import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';
import { ArrowRight, CheckCircle2, LayoutTemplate, Database, Bot, ShoppingCart, Plus, Edit3, Trash2, Code2, Smartphone, Globe, PenTool, Search, Server, Shield, Zap, Cloud, Cpu } from 'lucide-react';
import { usePortfolio, Service } from '../../context/PortfolioContext';
import { ServiceModal } from './editor/ServiceModal';
import { EditableText } from './editor/EditableText';

const iconMap: Record<string, React.ReactNode> = {
  LayoutTemplate: <LayoutTemplate size={32} />,
  Database: <Database size={32} />,
  Bot: <Bot size={32} />,
  ShoppingCart: <ShoppingCart size={32} />,
  Code2: <Code2 size={32} />,
  Smartphone: <Smartphone size={32} />,
  Globe: <Globe size={32} />,
  PenTool: <PenTool size={32} />,
  Search: <Search size={32} />,
  Server: <Server size={32} />,
  Shield: <Shield size={32} />,
  Zap: <Zap size={32} />,
  Cloud: <Cloud size={32} />,
  Cpu: <Cpu size={32} />
};

export function ServicesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, isEditMode, addService, updateService, deleteService, updatePersonalInfo } = usePortfolio();
  const { services, projects, personalInfo } = data;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const handleAdd = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, service: Service) => {
    e.stopPropagation();
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this service?')) {
      deleteService(id);
    }
  };

  const handleSave = (service: Service) => {
    if (editingService) {
      updateService(service.id, service);
    } else {
      addService(service);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <PortfolioHeader onNavigate={onNavigate} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-24 relative">
            {isEditMode && (
              <button 
                onClick={handleAdd}
                className="absolute -top-12 right-0 bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-medium hover:bg-blue-600 transition-colors shadow-lg"
              >
                <Plus size={16} /> Add New Service
              </button>
            )}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-blue-500 font-semibold tracking-widest uppercase text-sm">
                <EditableText value={personalInfo.servicesPageTitle} onSave={(val) => updatePersonalInfo('servicesPageTitle', val)} />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                <EditableText value={personalInfo.servicesPageHeading1} onSave={(val) => updatePersonalInfo('servicesPageHeading1', val)} /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600"><EditableText value={personalInfo.servicesPageHeading2} onSave={(val) => updatePersonalInfo('servicesPageHeading2', val)} /></span>
              </h1>
              <div className="text-xl text-slate-400 leading-relaxed">
                <EditableText value={personalInfo.servicesPageDescription} onSave={(val) => updatePersonalInfo('servicesPageDescription', val)} multiline />
              </div>
            </motion.div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
            {services.map((service, idx) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => onNavigate(`/portfolio/service/${service.id}`)}
                className="group relative bg-white/5 border border-white/10 p-10 rounded-[2.5rem] hover:bg-white/10 transition-all cursor-pointer overflow-hidden"
              >
                {isEditMode && (
                  <div className="absolute top-6 right-6 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleEdit(e, service)}
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-lg"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, service.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-0" />
                <div className="relative z-10">
                  <div className="text-blue-400 mb-8 bg-blue-500/10 w-16 h-16 rounded-2xl flex items-center justify-center">
                    {iconMap[service.icon] || <LayoutTemplate size={32} />}
                  </div>
                  <h3 className="text-3xl font-bold mb-4 group-hover:text-blue-400 transition-colors">{service.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-8 text-lg">{service.shortDescription}</p>
                  
                  <div className="space-y-3 mb-10">
                    {service.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-300">
                        <CheckCircle2 size={18} className="text-blue-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                    View Details <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Why Choose Me */}
          <section className="mb-32 bg-white/[0.02] border border-white/5 rounded-[3rem] p-12 md:p-20">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-bold tracking-tighter mb-6">Why Work With Me?</h2>
              <p className="text-lg text-slate-400">I don't just build websites; I build digital products that solve real business problems and drive growth.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                  <span className="text-2xl font-bold">01</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Strategic Approach</h3>
                <p className="text-slate-400 leading-relaxed">Every project starts with a deep dive into your business goals to ensure the final product delivers measurable results.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                  <span className="text-2xl font-bold">02</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Modern Tech Stack</h3>
                <p className="text-slate-400 leading-relaxed">Utilizing the latest tools like Elementor, JetEngine, and AI APIs to build scalable and future-proof solutions.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                  <span className="text-2xl font-bold">03</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Ongoing Support</h3>
                <p className="text-slate-400 leading-relaxed">I provide comprehensive training and ongoing support to ensure you can manage your new platform with confidence.</p>
              </div>
            </div>
          </section>

          {/* Featured Projects */}
          <section className="mb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4"><EditableText value={personalInfo.servicesPageProjectsTitle} onSave={(val) => updatePersonalInfo('servicesPageProjectsTitle', val)} /></h2>
                <p className="text-slate-400 max-w-2xl"><EditableText value={personalInfo.servicesPageProjectsSubtitle} onSave={(val) => updatePersonalInfo('servicesPageProjectsSubtitle', val)} /></p>
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/projects')}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium self-start md:self-auto"
              >
                <EditableText value={personalInfo.servicesPageProjectsButton} onSave={(val) => updatePersonalInfo('servicesPageProjectsButton', val)} /> <ArrowRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.slice(0, 2).map((project) => (
                <div 
                  key={project.id}
                  onClick={() => onNavigate(`/portfolio/project/${project.id}`)}
                  className="group relative aspect-video rounded-3xl overflow-hidden cursor-pointer"
                >
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="text-sm font-medium text-blue-400 mb-2">{project.category}</div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">{project.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 rounded-[3rem] p-12 md:p-20 text-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6"><EditableText value={personalInfo.servicesPageCtaTitle} onSave={(val) => updatePersonalInfo('servicesPageCtaTitle', val)} /></h2>
              <div className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                <EditableText value={personalInfo.servicesPageCtaSubtitle} onSave={(val) => updatePersonalInfo('servicesPageCtaSubtitle', val)} multiline />
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/contact')}
                className="bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <EditableText value={personalInfo.servicesPageCtaButton} onSave={(val) => updatePersonalInfo('servicesPageCtaButton', val)} /> <ArrowRight size={20} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <PortfolioFooter />
      <ServiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingService} 
      />
    </div>
  );
}
