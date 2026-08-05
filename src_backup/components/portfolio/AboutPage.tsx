import React from 'react';
import { motion } from 'motion/react';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';
import { ArrowRight, CheckCircle2, Briefcase, Code2 } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { EditableText } from './editor/EditableText';
import { EditableImage } from './editor/EditableImage';

export function AboutPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, updatePersonalInfo } = usePortfolio();
  const { personalInfo, services, projects } = data;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <PortfolioHeader onNavigate={onNavigate} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-32 pt-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold tracking-wide uppercase">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <EditableText value={personalInfo.aboutPageTitle} onSave={(val) => updatePersonalInfo('aboutPageTitle', val)} />
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                  <EditableText value={personalInfo.aboutPageHeading1} onSave={(val) => updatePersonalInfo('aboutPageHeading1', val)} /> <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 italic pr-4">
                    <EditableText value={personalInfo.aboutPageHeading2} onSave={(val) => updatePersonalInfo('aboutPageHeading2', val)} />
                  </span>
                </h1>
                <div className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-xl">
                  <EditableText value={personalInfo.about} onSave={(val) => updatePersonalInfo('about', val)} multiline />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => onNavigate('/portfolio/contact')}
                    className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <EditableText value={personalInfo.aboutPageButton} onSave={(val) => updatePersonalInfo('aboutPageButton', val)} /> <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="relative aspect-square md:aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 group shadow-2xl">
                  <EditableImage 
                    src={personalInfo.image || "https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=2070&auto=format&fit=crop"} 
                    alt={personalInfo.name} 
                    onSave={(val) => updatePersonalInfo('image', val)}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    recommendedSize="800x600px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4">
                      <div className="text-4xl font-bold text-blue-400"><EditableText value={personalInfo.aboutPageStatNumber} onSave={(val) => updatePersonalInfo('aboutPageStatNumber', val)} /></div>
                      <div className="text-sm text-slate-300 font-medium leading-tight text-left"><EditableText value={personalInfo.aboutPageStatText} onSave={(val) => updatePersonalInfo('aboutPageStatText', val)} multiline /></div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-blue-500/10 rounded-full blur-[60px]" />
              </motion.div>
            </div>
          </div>

          {/* Experience & Skills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-32">
            {/* Experience */}
            <section>
              <div className="flex items-center gap-3 mb-10">
                <Briefcase className="text-blue-500" size={28} />
                <h2 className="text-3xl font-bold tracking-tight"><EditableText value={personalInfo.experienceTitle} onSave={(val) => updatePersonalInfo('experienceTitle', val)} /></h2>
              </div>
              <div className="space-y-8">
                {personalInfo.experience?.map((exp: any, idx: number) => (
                  <div key={idx} className="relative pl-8 border-l border-white/10 pb-8 last:pb-0">
                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div className="text-sm font-bold text-blue-400 mb-2">
                      <EditableText 
                        value={exp.period} 
                        onSave={(val) => {
                          const newExp = [...personalInfo.experience];
                          newExp[idx].period = val;
                          updatePersonalInfo('experience', newExp);
                        }} 
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      <EditableText 
                        value={exp.role} 
                        onSave={(val) => {
                          const newExp = [...personalInfo.experience];
                          newExp[idx].role = val;
                          updatePersonalInfo('experience', newExp);
                        }} 
                      />
                    </h3>
                    <div className="text-slate-400 font-medium mb-4">
                      <EditableText 
                        value={exp.company} 
                        onSave={(val) => {
                          const newExp = [...personalInfo.experience];
                          newExp[idx].company = val;
                          updatePersonalInfo('experience', newExp);
                        }} 
                      />
                    </div>
                    <div className="text-slate-300 leading-relaxed">
                      <EditableText 
                        value={exp.description} 
                        onSave={(val) => {
                          const newExp = [...personalInfo.experience];
                          newExp[idx].description = val;
                          updatePersonalInfo('experience', newExp);
                        }} 
                        multiline
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Skills */}
            <section>
              <div className="flex items-center gap-3 mb-10">
                <Code2 className="text-blue-500" size={28} />
                <h2 className="text-3xl font-bold tracking-tight"><EditableText value={personalInfo.skillsTitle} onSave={(val) => updatePersonalInfo('skillsTitle', val)} /></h2>
              </div>
              <div className="space-y-6">
                {personalInfo.skills?.map((skill: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-slate-200">
                        <EditableText 
                          value={skill.name} 
                          onSave={(val) => {
                            const newSkills = [...personalInfo.skills];
                            newSkills[idx].name = val;
                            updatePersonalInfo('skills', newSkills);
                          }} 
                        />
                      </span>
                      <span className="text-slate-400">
                        <EditableText 
                          value={skill.level.toString()} 
                          onSave={(val) => {
                            const newSkills = [...personalInfo.skills];
                            newSkills[idx].level = parseInt(val) || 0;
                            updatePersonalInfo('skills', newSkills);
                          }} 
                        />%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.level}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Featured Services */}
          <section className="mb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4"><EditableText value="What I Do" onSave={() => {}} /></h2>
                <p className="text-slate-400 max-w-2xl"><EditableText value="Specialized services to help your business grow." onSave={() => {}} /></p>
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/services')}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium self-start md:self-auto"
              >
                <EditableText value="View All Services" onSave={() => {}} /> <ArrowRight size={18} />
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

          {/* Featured Projects */}
          <section className="mb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4"><EditableText value="Selected Works" onSave={() => {}} /></h2>
                <p className="text-slate-400 max-w-2xl"><EditableText value="A glimpse into my recent projects." onSave={() => {}} /></p>
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/projects')}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium self-start md:self-auto"
              >
                View All Projects <ArrowRight size={18} />
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
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">Ready to start your project?</h2>
              <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Let's build something amazing together. Reach out to discuss your ideas.
              </p>
              <button 
                onClick={() => onNavigate('/portfolio/contact')}
                className="bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                Contact Me <ArrowRight size={20} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <PortfolioFooter />
    </div>
  );
}
