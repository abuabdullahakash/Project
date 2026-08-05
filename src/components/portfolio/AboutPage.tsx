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
          {/* Advanced Premium Hero Section */}
          <div className="relative pt-12 lg:pt-24 pb-20 mb-32">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px]" />
              <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
              <div className="lg:col-span-7 space-y-10">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  <span className="text-sm font-semibold tracking-widest uppercase text-slate-300">
                    <EditableText value={personalInfo.aboutPageTitle || "ABOUT ME"} onSave={(val) => updatePersonalInfo('aboutPageTitle', val)} />
                  </span>
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                  className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.95]"
                >
                  <span className="block text-white"><EditableText value="Freelance" onSave={() => {}}/></span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500"><EditableText value="Developer &" onSave={() => {}}/></span>
                  <span className="block text-blue-500"><EditableText value="Digital Architect." onSave={() => {}}/></span>
                </motion.h1>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="text-xl md:text-2xl text-slate-400 font-light leading-relaxed max-w-2xl border-l-2 border-blue-500/30 pl-6 lg:pl-8 ml-2"
                >
                  <EditableText value={personalInfo.about || "I engineer scalable, high-performance web applications using WordPress, Elementor, and JetEngine. Building digital experiences that drive results."} onSave={(val) => updatePersonalInfo('about', val)} multiline />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="flex flex-wrap gap-6 pt-4"
                >
                  <button 
                    onClick={() => onNavigate('/portfolio/contact')}
                    className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition-all flex items-center gap-3 hover:gap-4 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                  >
                    <EditableText value={personalInfo.aboutPageButton || "Let's Talk"} onSave={(val) => updatePersonalInfo('aboutPageButton', val)} /> <ArrowRight size={20} />
                  </button>
                  <button 
                    onClick={() => onNavigate('/portfolio/projects')}
                    className="group px-8 py-4 rounded-full font-bold text-white border border-white/20 hover:bg-white/10 transition-all flex items-center gap-3"
                  >
                    View Works
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </button>
                </motion.div>
              </div>

              <div className="lg:col-span-5 relative mt-10 lg:mt-0">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, duration: 1, type: "spring", stiffness: 50 }}
                  className="relative z-20 aspect-[3/4] md:aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
                >
                  <EditableImage 
                    src={personalInfo.image || "https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=2070&auto=format&fit=crop"} 
                    alt={personalInfo.name} 
                    onSave={(val) => updatePersonalInfo('image', val)}
                    className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110"
                    recommendedSize="800x1000px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent opacity-90" />
                  
                  <div className="absolute bottom-8 left-8 right-8">
                    <h3 className="text-4xl font-bold mb-2 tracking-tight"><EditableText value={personalInfo.name || "Akash"} onSave={(val) => updatePersonalInfo('name', val)} /></h3>
                    <p className="text-blue-400 font-semibold tracking-widest uppercase text-sm"><EditableText value={personalInfo.title || "WordPress Expert"} onSave={(val) => updatePersonalInfo('title', val)} /></p>
                  </div>
                </motion.div>

                {/* Decorative floating elements */}
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="absolute -bottom-8 -left-8 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-xl hidden lg:block hover:-translate-y-2 transition-transform duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-2xl font-bold border border-blue-500/30">
                       <EditableText value={personalInfo.aboutPageStatNumber || "30+"} onSave={(val) => updatePersonalInfo('aboutPageStatNumber', val)} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-300 uppercase tracking-wider"><EditableText value={personalInfo.aboutPageStatText || "Websites Built"} onSave={(val) => updatePersonalInfo('aboutPageStatText', val)} /></div>
                      <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium"><EditableText value="Globally" onSave={() => {}} /></div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                  className="absolute top-12 -right-8 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl hidden xl:block hover:-translate-y-2 transition-transform duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 text-xl font-bold border border-purple-500/30">
                       <EditableText value="5+" onSave={() => {}} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider"><EditableText value="Years Exp." onSave={() => {}} /></div>
                    </div>
                  </div>
                </motion.div>
                
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-[100px]" />
              </div>
            </div>
          </div>

          {/* Premium Core Mission / Bento Grid Section */}
          <section className="mb-32">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              <div className="md:col-span-12 lg:col-span-8 bg-white/5 border border-white/10 rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden group hover:border-white/20 transition-colors duration-500">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-blue-500/20 transition-colors duration-700" />
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8 relative z-10">
                  <EditableText value="The Philosophy" onSave={() => {}} />
                </h2>
                <div className="text-lg md:text-xl text-slate-400 leading-relaxed space-y-6 relative z-10 max-w-3xl font-light">
                  <p><EditableText value="I started my journey in web development with a simple goal: to create digital experiences that are both visually stunning and technically robust. Every pixel must have a purpose, and every line of code must perform." onSave={() => {}} multiline /></p>
                  <p><EditableText value="My deep expertise in WordPress, Elementor Pro, and JetEngine allows me to push the boundaries of what a CMS can achieve. From intricate booking systems to complex real estate directories, I build custom solutions tailored to your unique business needs." onSave={() => {}} multiline /></p>
                </div>
              </div>

              <div className="md:col-span-12 lg:col-span-4 bg-gradient-to-br from-blue-900/20 to-[#0a0a0a] border border-blue-500/20 rounded-[2.5rem] p-10 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/40 transition-colors duration-500">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-2xl font-bold mb-8 relative z-10"><EditableText value="The Approach" onSave={() => {}} /></h3>
                <ul className="space-y-6 text-slate-300 font-medium relative z-10">
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <span><EditableText value="Strategy First Concepting" onSave={() => {}} /></span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <span><EditableText value="Pixel-Perfect Execution" onSave={() => {}} /></span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <span><EditableText value="Performance Optimization" onSave={() => {}} /></span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <span><EditableText value="Scalable Architecture" onSave={() => {}} /></span>
                  </li>
                </ul>
              </div>

            </div>
          </section>

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
                  className="group relative aspect-video rounded-[2rem] overflow-hidden cursor-pointer border border-white/10"
                >
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-2">{project.category}</div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">{project.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Gallery Section */}
          <section className="mb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4"><EditableText value="Gallery & Workflow" onSave={() => {}} /></h2>
                <p className="text-slate-400 max-w-2xl"><EditableText value="A behind-the-scenes look at my workspace and creative process." onSave={() => {}} /></p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Image 1: Tall */}
              <div className="md:col-span-1 md:row-span-2 rounded-[2rem] overflow-hidden border border-white/10 aspect-[3/4] md:aspect-auto">
                <EditableImage 
                  src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop" 
                  alt="Workflow" 
                  onSave={() => {}} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                />
              </div>
              {/* Image 2: Wide */}
              <div className="md:col-span-2 rounded-[2rem] overflow-hidden border border-white/10 aspect-[16/9] md:aspect-auto h-[250px] lg:h-[300px]">
                <EditableImage 
                  src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop" 
                  alt="Workspace" 
                  onSave={() => {}} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                />
              </div>
              {/* Image 3: Square */}
              <div className="md:col-span-1 rounded-[2rem] overflow-hidden border border-white/10 aspect-square h-[250px] lg:h-[300px]">
                <EditableImage 
                  src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop" 
                  alt="Code" 
                  onSave={() => {}} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                />
              </div>
              {/* Image 4: Square */}
              <div className="md:col-span-1 rounded-[2rem] overflow-hidden border border-white/10 aspect-square h-[250px] lg:h-[300px]">
                <EditableImage 
                  src="https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=2070&auto=format&fit=crop" 
                  alt="Design" 
                  onSave={() => {}} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                />
              </div>
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
