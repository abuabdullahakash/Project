import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, LayoutTemplate, Database, Bot, ShoppingCart, ExternalLink, ChevronRight, Mail, Phone, MapPin, Github, Linkedin, Twitter, Plus, X, CheckCircle2 } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';
import { EditableText } from './editor/EditableText';
import { EditableImage } from './editor/EditableImage';

const iconMap: Record<string, React.ElementType> = {
  LayoutTemplate,
  Database,
  Bot,
  ShoppingCart
};

export function PublicPortfolio({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, updatePersonalInfo, isEditMode } = usePortfolio();
  const { personalInfo, services, projects } = data;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      <PortfolioHeader onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.1] mb-8">
              <EditableText value={personalInfo.heroTitle} onSave={(val) => updatePersonalInfo('heroTitle', val)} /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300"><EditableText value={personalInfo.heroSubtitle} onSave={(val) => updatePersonalInfo('heroSubtitle', val)} /></span> <EditableText value={personalInfo.heroDescription} onSave={(val) => updatePersonalInfo('heroDescription', val)} />
            </h1>
            <div className="text-xl md:text-2xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
              <EditableText value={personalInfo.bio} onSave={(val) => updatePersonalInfo('bio', val)} multiline />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => onNavigate('/portfolio/projects')} className="bg-white text-black px-8 py-4 rounded-full font-semibold flex items-center gap-2 hover:bg-slate-200 transition-colors">
                <EditableText value={personalInfo.heroButton1} onSave={(val) => updatePersonalInfo('heroButton1', val)} /> <ArrowRight size={18} />
              </button>
              <button onClick={() => onNavigate('/portfolio/contact')} className="px-8 py-4 rounded-full font-semibold border border-white/20 hover:bg-white/5 transition-colors">
                <EditableText value={personalInfo.heroButton2} onSave={(val) => updatePersonalInfo('heroButton2', val)} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section - Screenshot Layout */}
      <section id="about" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Image Side (Left) */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative flex justify-center items-center order-1"
            >
              {/* Circular Background */}
              <div className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px] bg-[#1a1a1a] rounded-full flex items-center justify-center">
                
                {/* Floating Shapes */}
                {/* Top Left Circle */}
                <div className="absolute -top-4 -left-4 md:top-10 md:-left-10 w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full" />
                {/* Bottom Left Triangle */}
                <div className="absolute bottom-10 -left-8 md:bottom-20 md:-left-12 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[26px] md:border-l-[20px] md:border-r-[20px] md:border-b-[34px] border-b-blue-500 -rotate-12" />
                {/* Top Right Square/Diamond */}
                <div className="absolute top-20 -right-4 md:top-32 md:-right-8 w-4 h-4 md:w-6 md:h-6 bg-blue-400 rotate-45" />

                {/* Main Image */}
                <div className="w-[90%] h-[90%] rounded-full overflow-hidden z-10 border-4 border-[#050505]">
                  <EditableImage 
                    src={personalInfo.image || "https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=2070&auto=format&fit=crop"} 
                    alt="Profile" 
                    onSave={(val) => updatePersonalInfo('image', val)}
                    className="w-full h-full object-cover"
                    recommendedSize="600x600px"
                  />
                </div>
              </div>
            </motion.div>

            {/* Content Side (Right) */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-6 order-2"
            >
              <h3 className="text-lg font-bold text-white">
                <EditableText value="About Me" onSave={() => {}} />
              </h3>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1] flex flex-wrap gap-x-3">
                <EditableText value={personalInfo.name.split(' ').slice(0, -1).join(' ')} onSave={(val) => {
                  const parts = personalInfo.name.split(' ');
                  const lastName = parts[parts.length - 1] || '';
                  updatePersonalInfo('name', val + (lastName ? ' ' + lastName : ''));
                }} />
                <span className="text-blue-500">
                  <EditableText value={personalInfo.name.split(' ').slice(-1)[0] || ''} onSave={(val) => {
                    const parts = personalInfo.name.split(' ');
                    const firstName = parts.slice(0, -1).join(' ');
                    updatePersonalInfo('name', (firstName ? firstName + ' ' : '') + val);
                  }} />
                </span>
              </h2>
              
              <div className="text-slate-400 leading-relaxed text-base md:text-lg">
                <EditableText value={personalInfo.about} onSave={(val) => updatePersonalInfo('about', val)} multiline />
              </div>

              <div className="pt-4">
                <h3 className="text-lg font-bold text-white mb-4">My Skills</h3>
                <div className="flex flex-wrap gap-3">
                  {personalInfo.aboutSkills.map((skill: string, index: number) => (
                    <span key={index} className="px-4 py-2 rounded-md bg-[#1a1a1a] border border-white/5 text-sm font-medium text-slate-300 hover:text-white hover:border-blue-500/50 transition-all cursor-default flex items-center gap-2 group">
                      <EditableText 
                        value={skill} 
                        onSave={(val) => {
                          const newSkills = [...personalInfo.aboutSkills];
                          newSkills[index] = val;
                          updatePersonalInfo('aboutSkills', newSkills);
                        }} 
                      />
                      {isEditMode && (
                        <button 
                          onClick={() => {
                            const newSkills = personalInfo.aboutSkills.filter((_: any, i: number) => i !== index);
                            updatePersonalInfo('aboutSkills', newSkills);
                          }}
                          className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditMode && (
                    <button 
                      onClick={() => {
                        const newSkills = [...personalInfo.aboutSkills, 'New Skill'];
                        updatePersonalInfo('aboutSkills', newSkills);
                      }}
                      className="px-4 py-2 rounded-md border border-dashed border-white/20 text-sm font-medium text-slate-400 hover:text-white hover:border-white/40 transition-all flex items-center gap-2"
                    >
                      <Plus size={14} /> Add Skill
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => onNavigate('/portfolio/about')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <EditableText value={personalInfo.aboutButton} onSave={(val) => updatePersonalInfo('aboutButton', val)} /> <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Services Section - Modern Layout */}
      <section id="services" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="max-w-3xl">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-6"><EditableText value={personalInfo.servicesTitle} onSave={(val) => updatePersonalInfo('servicesTitle', val)} /></h2>
              <p className="text-xl text-slate-400 leading-relaxed"><EditableText value={personalInfo.servicesSubtitle} onSave={(val) => updatePersonalInfo('servicesSubtitle', val)} /></p>
            </div>
            <button 
              onClick={() => onNavigate('/portfolio/services')}
              className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors font-medium self-start md:self-auto px-6 py-3 rounded-full border border-white/10 hover:border-blue-400/50 bg-white/5 hover:bg-blue-500/10"
            >
              <EditableText value={personalInfo.homeServicesButton} onSave={(val) => updatePersonalInfo('homeServicesButton', val)} /> <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => {
              const Icon = iconMap[service.icon] || LayoutTemplate;
              return (
                <motion.div 
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onNavigate(`/portfolio/service/${service.id}`)}
                  className="group cursor-pointer p-8 rounded-[2rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-500 flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors duration-500" />
                  
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 text-slate-300 group-hover:text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10">
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 tracking-tight relative z-10">{service.title}</h3>
                  <p className="text-slate-400 mb-8 leading-relaxed flex-grow relative z-10 text-sm">{service.shortDescription}</p>
                  
                  <div className="flex items-center text-sm font-semibold text-slate-300 group-hover:text-white mt-auto relative z-10 pt-6 border-t border-white/5">
                    <EditableText value={personalInfo.homeServiceExplore} onSave={(val) => updatePersonalInfo('homeServiceExplore', val)} /> 
                    <ArrowRight size={16} className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Projects Section - Modern Layout */}
      <section id="projects" className="py-32 px-6 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-6"><EditableText value={personalInfo.projectsTitle} onSave={(val) => updatePersonalInfo('projectsTitle', val)} /></h2>
              <p className="text-xl text-slate-400 leading-relaxed"><EditableText value={personalInfo.projectsSubtitle} onSave={(val) => updatePersonalInfo('projectsSubtitle', val)} /></p>
            </div>
            <button 
              onClick={() => onNavigate('/portfolio/projects')}
              className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors font-medium self-start md:self-auto px-6 py-3 rounded-full border border-white/10 hover:border-blue-400/50 bg-white/5 hover:bg-blue-500/10"
            >
              <EditableText value={personalInfo.homeProjectsButton} onSave={(val) => updatePersonalInfo('homeProjectsButton', val)} /> <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((project, index) => (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onNavigate(`/portfolio/project/${project.id}`)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden mb-8 border border-white/10">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full text-sm font-medium">
                      <EditableText value={personalInfo.homeProjectView} onSave={(val) => updatePersonalInfo('homeProjectView', val)} />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
                      <ArrowRight size={24} className="-rotate-45" />
                    </div>
                  </div>
                </div>
                <div className="px-2">
                  <div className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">{project.category}</div>
                  <h3 className="text-3xl font-bold mb-3 tracking-tight group-hover:text-blue-400 transition-colors">{project.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-lg">{project.shortDescription}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 rounded-[3rem] p-12 md:p-20 backdrop-blur-sm">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8"><EditableText value={personalInfo.contactTitle} onSave={(val) => updatePersonalInfo('contactTitle', val)} /></h2>
          <div className="text-xl text-slate-400 mb-12 leading-relaxed">
            <EditableText value={personalInfo.contactSubtitle} onSave={(val) => updatePersonalInfo('contactSubtitle', val)} multiline />
          </div>
          <button 
            onClick={() => onNavigate('/portfolio/contact')}
            className="bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            <EditableText value={personalInfo.contactButton} onSave={(val) => updatePersonalInfo('contactButton', val)} /> <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <PortfolioFooter />
    </div>
  );
}
