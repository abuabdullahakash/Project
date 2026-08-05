import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';
import { Mail, Phone, MapPin, Send, ArrowRight, Github, Linkedin, Twitter, Facebook, Instagram, Youtube, Dribbble, Figma } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { EditableText } from './editor/EditableText';

const socialIcons: Record<string, React.ElementType> = {
  Github, Linkedin, Twitter, Facebook, Instagram, Youtube, Dribbble, Figma
};

const contactIcons: Record<string, React.ElementType> = {
  Mail, Phone, MapPin
};

export function ContactPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, updatePersonalInfo } = usePortfolio();
  const { personalInfo, services } = data;
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormState({ name: '', email: '', message: '' });
      setTimeout(() => setIsSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <PortfolioHeader onNavigate={onNavigate} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-blue-500 font-semibold tracking-widest uppercase text-sm">
                <EditableText value={personalInfo.contactPageTitle} onSave={(val) => updatePersonalInfo('contactPageTitle', val)} />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                <EditableText value={personalInfo.contactPageHeading1} onSave={(val) => updatePersonalInfo('contactPageHeading1', val)} /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600"><EditableText value={personalInfo.contactPageHeading2} onSave={(val) => updatePersonalInfo('contactPageHeading2', val)} /></span>
              </h1>
              <div className="text-xl text-slate-400 leading-relaxed">
                <EditableText value={personalInfo.contactPageDescription} onSave={(val) => updatePersonalInfo('contactPageDescription', val)} multiline />
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-32">
            {/* Contact Info */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-12"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-8"><EditableText value={personalInfo.contactPageFormTitle} onSave={(val) => updatePersonalInfo('contactPageFormTitle', val)} /></h2>
                <div className="space-y-6">
                  {(personalInfo.contactInfo || []).map((contact: any, index: number) => {
                    const Icon = contactIcons[contact.icon] || Mail;
                    return (
                      <div key={contact.id || index} className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                          <Icon size={24} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{contact.type}</div>
                          <div className="text-xl font-medium text-slate-300">
                            {contact.value}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-6">Connect with me</h3>
                <div className="flex flex-wrap gap-4">
                  {(personalInfo.socials || []).map((social: any, index: number) => {
                    const Icon = socialIcons[social.icon] || Github;
                    return (
                      <a key={social.id || index} href={social.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-blue-400 transition-all" title={social.name}>
                        <Icon size={20} />
                      </a>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/[0.02] border border-white/10 p-10 md:p-12 rounded-[3rem]"
            >
              <h2 className="text-3xl font-bold tracking-tight mb-8">Send a Message</h2>
              {isSuccess ? (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-6 rounded-2xl text-center">
                  <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                  <p>Thank you for reaching out. I'll get back to you as soon as possible.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-bold text-slate-400 ml-4">Your Name</label>
                    <input 
                      type="text" 
                      id="name"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState({...formState, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-bold text-slate-400 ml-4">Email Address</label>
                    <input 
                      type="email" 
                      id="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState({...formState, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-bold text-slate-400 ml-4">Your Message</label>
                    <textarea 
                      id="message"
                      required
                      rows={5}
                      value={formState.message}
                      onChange={(e) => setFormState({...formState, message: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                      placeholder="Tell me about your project..."
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : (
                      <><EditableText value={personalInfo.contactPageFormButton} onSave={(val) => updatePersonalInfo('contactPageFormButton', val)} /> <Send size={18} /></>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>

          {/* Featured Services */}
          <section className="mb-20 pt-20 border-t border-white/10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4"><EditableText value={personalInfo.contactPageServicesTitle} onSave={(val) => updatePersonalInfo('contactPageServicesTitle', val)} /></h2>
                <p className="text-slate-400 max-w-2xl"><EditableText value={personalInfo.contactPageServicesSubtitle} onSave={(val) => updatePersonalInfo('contactPageServicesSubtitle', val)} /></p>
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/services')}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium self-start md:self-auto"
              >
                <EditableText value={personalInfo.contactPageServicesButton} onSave={(val) => updatePersonalInfo('contactPageServicesButton', val)} /> <ArrowRight size={18} />
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

        </div>
      </main>

      <PortfolioFooter />
    </div>
  );
}
