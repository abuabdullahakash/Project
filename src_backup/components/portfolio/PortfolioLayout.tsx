import React, { useState } from 'react';
import { Mail, Phone, MapPin, Github, Linkedin, Twitter, Menu, X, Facebook, Instagram, Youtube, Dribbble, Figma, Plus, Trash2, Globe, MessageCircle } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { EditableText } from './editor/EditableText';

const socialIcons: Record<string, React.ElementType> = {
  Github, Linkedin, Twitter, Facebook, Instagram, Youtube, Dribbble, Figma
};

const contactIcons: Record<string, React.ElementType> = {
  Mail, Phone, MapPin, Globe: Globe, MessageCircle: MessageCircle, Github, Linkedin, Twitter, Facebook, Instagram, Youtube
};

export function PortfolioHeader({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, updatePersonalInfo } = usePortfolio();
  const { personalInfo } = data;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('/portfolio')}
          className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-2"
        >
          {personalInfo.imageLogo ? (
            <img src={personalInfo.imageLogo} alt="Logo" className="h-8 object-contain" />
          ) : (
            <><EditableText value={personalInfo.name} onSave={(val) => updatePersonalInfo('name', val)} /><span className="text-blue-500">.</span></>
          )}
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <button onClick={() => onNavigate('/portfolio/about')} className="hover:text-white transition-colors"><EditableText value={personalInfo.navAbout} onSave={(val) => updatePersonalInfo('navAbout', val)} /></button>
          <button onClick={() => onNavigate('/portfolio/services')} className="hover:text-white transition-colors"><EditableText value={personalInfo.navServices} onSave={(val) => updatePersonalInfo('navServices', val)} /></button>
          <button onClick={() => onNavigate('/portfolio/projects')} className="hover:text-white transition-colors"><EditableText value={personalInfo.navProjects} onSave={(val) => updatePersonalInfo('navProjects', val)} /></button>
          <button onClick={() => onNavigate('/portfolio/contact')} className="hover:text-white transition-colors"><EditableText value={personalInfo.navContact} onSave={(val) => updatePersonalInfo('navContact', val)} /></button>
        </div>
        <button 
          onClick={() => onNavigate('/portfolio/contact')}
          className="hidden md:block bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-200 transition-colors"
        >
          <EditableText value={personalInfo.navButton} onSave={(val) => updatePersonalInfo('navButton', val)} />
        </button>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#050505] border-b border-white/5 px-6 py-4 flex flex-col gap-4 absolute w-full left-0 top-20 shadow-2xl">
          <button onClick={() => { onNavigate('/portfolio/about'); setIsMobileMenuOpen(false); }} className="text-left text-slate-300 hover:text-white py-2 font-medium"><EditableText value={personalInfo.navAbout} onSave={(val) => updatePersonalInfo('navAbout', val)} /></button>
          <button onClick={() => { onNavigate('/portfolio/services'); setIsMobileMenuOpen(false); }} className="text-left text-slate-300 hover:text-white py-2 font-medium"><EditableText value={personalInfo.navServices} onSave={(val) => updatePersonalInfo('navServices', val)} /></button>
          <button onClick={() => { onNavigate('/portfolio/projects'); setIsMobileMenuOpen(false); }} className="text-left text-slate-300 hover:text-white py-2 font-medium"><EditableText value={personalInfo.navProjects} onSave={(val) => updatePersonalInfo('navProjects', val)} /></button>
          <button onClick={() => { onNavigate('/portfolio/contact'); setIsMobileMenuOpen(false); }} className="text-left text-slate-300 hover:text-white py-2 font-medium"><EditableText value={personalInfo.navContact} onSave={(val) => updatePersonalInfo('navContact', val)} /></button>
          <button 
            onClick={() => { onNavigate('/portfolio/contact'); setIsMobileMenuOpen(false); }}
            className="bg-white text-black px-6 py-3 rounded-full text-sm font-semibold hover:bg-slate-200 transition-colors w-full mt-2"
          >
            <EditableText value={personalInfo.navButton} onSave={(val) => updatePersonalInfo('navButton', val)} />
          </button>
        </div>
      )}
    </nav>
  );
}

export function PortfolioFooter() {
  const { data, updatePersonalInfo, isEditMode } = usePortfolio();
  const { personalInfo } = data;

  const addSocial = () => {
    const newSocials = [...(personalInfo.socials || [])];
    newSocials.push({ id: Date.now().toString(), name: 'Facebook', url: 'https://facebook.com', icon: 'Facebook' });
    updatePersonalInfo('socials', newSocials);
  };

  const updateSocial = (index: number, field: string, value: string) => {
    const newSocials = [...(personalInfo.socials || [])];
    newSocials[index] = { ...newSocials[index], [field]: value };
    // Auto-update icon based on name if icon field wasn't explicitly changed
    if (field === 'name') {
      const iconName = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      if (socialIcons[iconName]) {
        newSocials[index].icon = iconName;
      }
    }
    updatePersonalInfo('socials', newSocials);
  };

  const removeSocial = (index: number) => {
    const newSocials = [...(personalInfo.socials || [])];
    newSocials.splice(index, 1);
    updatePersonalInfo('socials', newSocials);
  };

  const addContact = () => {
    const newContacts = [...(personalInfo.contactInfo || [])];
    newContacts.push({ id: Date.now().toString(), type: 'email', value: 'new@email.com', icon: 'Mail' });
    updatePersonalInfo('contactInfo', newContacts);
  };

  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...(personalInfo.contactInfo || [])];
    newContacts[index] = { ...newContacts[index], [field]: value };
    updatePersonalInfo('contactInfo', newContacts);
  };

  const removeContact = (index: number) => {
    const newContacts = [...(personalInfo.contactInfo || [])];
    newContacts.splice(index, 1);
    updatePersonalInfo('contactInfo', newContacts);
  };

  return (
    <footer className="border-t border-white/10 bg-[#050505] pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="text-2xl font-bold tracking-tighter mb-6 flex items-center gap-2">
              {personalInfo.imageLogo ? (
                <img src={personalInfo.imageLogo} alt="Logo" className="h-8 object-contain" />
              ) : (
                <><EditableText value={personalInfo.name} onSave={(val) => updatePersonalInfo('name', val)} /><span className="text-blue-500">.</span></>
              )}
            </div>
            <div className="text-slate-400 leading-relaxed max-w-sm">
              <EditableText value={personalInfo.bio} onSave={(val) => updatePersonalInfo('bio', val)} multiline />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-white font-bold"><EditableText value={personalInfo.footerContactTitle} onSave={(val) => updatePersonalInfo('footerContactTitle', val)} /></h4>
              {isEditMode && (
                <button onClick={addContact} className="text-blue-400 hover:text-blue-300 p-1 bg-blue-500/10 rounded-full">
                  <Plus size={16} />
                </button>
              )}
            </div>
            <ul className="space-y-4 text-slate-400">
              {(personalInfo.contactInfo || []).map((contact: any, index: number) => {
                const Icon = contactIcons[contact.icon] || Mail;
                return (
                  <li key={contact.id || index} className="flex items-center gap-3 group">
                    <Icon size={18} className="shrink-0" /> 
                    {isEditMode ? (
                      <div className="flex-1 flex items-center gap-2">
                        <select
                          value={contact.icon || 'Mail'}
                          onChange={(e) => updateContact(index, 'icon', e.target.value)}
                          className="bg-black border border-white/20 rounded px-2 py-1 text-xs text-white"
                        >
                          {Object.keys(contactIcons).map(iconName => (
                            <option key={iconName} value={iconName}>{iconName}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          value={contact.type} 
                          onChange={(e) => updateContact(index, 'type', e.target.value)}
                          className="w-20 bg-black border border-white/20 rounded px-2 py-1 text-xs"
                          placeholder="Type"
                        />
                        <input 
                          type="text" 
                          value={contact.value} 
                          onChange={(e) => updateContact(index, 'value', e.target.value)}
                          className="flex-1 bg-black border border-white/20 rounded px-2 py-1 text-sm"
                        />
                        <button onClick={() => removeContact(index)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span>{contact.value}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-white font-bold"><EditableText value={personalInfo.footerSocialTitle} onSave={(val) => updatePersonalInfo('footerSocialTitle', val)} /></h4>
              {isEditMode && (
                <button onClick={addSocial} className="text-blue-400 hover:text-blue-300 p-1 bg-blue-500/10 rounded-full">
                  <Plus size={16} />
                </button>
              )}
            </div>
            
            {isEditMode ? (
              <div className="space-y-3">
                {(personalInfo.socials || []).map((social: any, index: number) => {
                  const Icon = socialIcons[social.icon] || Github;
                  return (
                    <div key={social.id || index} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                      <Icon size={16} className="text-slate-400 shrink-0" />
                      <select
                        value={social.icon || 'Github'}
                        onChange={(e) => updateSocial(index, 'icon', e.target.value)}
                        className="bg-black border border-white/20 rounded px-2 py-1 text-xs text-white"
                      >
                        {Object.keys(socialIcons).map(iconName => (
                          <option key={iconName} value={iconName}>{iconName}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        value={social.name} 
                        onChange={(e) => updateSocial(index, 'name', e.target.value)}
                        className="w-24 bg-black border border-white/20 rounded px-2 py-1 text-xs text-white"
                        placeholder="Name (e.g. Facebook)"
                      />
                      <input 
                        type="text" 
                        value={social.url} 
                        onChange={(e) => updateSocial(index, 'url', e.target.value)}
                        className="flex-1 bg-black border border-white/20 rounded px-2 py-1 text-xs text-white"
                        placeholder="URL"
                      />
                      <button onClick={() => removeSocial(index)} className="text-red-400 hover:text-red-300 p-1 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                {(personalInfo.socials || []).map((social: any, index: number) => {
                  const Icon = socialIcons[social.icon] || Github;
                  return (
                    <a key={social.id || index} href={social.url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-blue-500 hover:text-white transition-colors" title={social.name}>
                      <Icon size={18} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} <EditableText value={personalInfo.name} onSave={(val) => updatePersonalInfo('name', val)} />. <EditableText value={personalInfo.footerRights} onSave={(val) => updatePersonalInfo('footerRights', val)} />
        </div>
      </div>
    </footer>
  );
}
