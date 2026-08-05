import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';
import { ArrowRight, Plus, Edit3, Trash2, Download, Star, ExternalLink, CheckCircle } from 'lucide-react';
import { usePortfolio, WPPlugin } from '../../context/PortfolioContext';
import { PluginModal } from './editor/PluginModal';
import { EditableText } from './editor/EditableText';

export function PluginsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data, isEditMode, addPlugin, updatePlugin, deletePlugin, updatePersonalInfo } = usePortfolio();
  const { plugins = [], services, personalInfo } = data;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<WPPlugin | null>(null);

  const handleAdd = () => {
    setEditingPlugin(null);
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, plugin: WPPlugin) => {
    e.stopPropagation();
    setEditingPlugin(plugin);
    setIsModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this plugin?')) {
      deletePlugin(id);
    }
  };

  const handleSave = (plugin: WPPlugin) => {
    if (editingPlugin) {
      updatePlugin(plugin.id, plugin);
    } else {
      addPlugin(plugin);
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
                <Plus size={16} /> Add New Plugin
              </button>
            )}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-blue-500 font-semibold tracking-widest uppercase text-sm">
                <EditableText value={personalInfo.pluginsPageTitle || 'Plugins'} onSave={(val) => updatePersonalInfo('pluginsPageTitle', val)} />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1]">
                <EditableText value={personalInfo.pluginsPageHeading1 || 'Premium WP'} onSave={(val) => updatePersonalInfo('pluginsPageHeading1', val)} /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300"><EditableText value={personalInfo.pluginsPageHeading2 || 'Plugins.'} onSave={(val) => updatePersonalInfo('pluginsPageHeading2', val)} /></span>
              </h1>
              <div className="text-xl text-slate-400 leading-relaxed">
                <EditableText value={personalInfo.pluginsPageDescription || 'Lightweight, secure, and fully responsive plugins designed to extend WordPress and WooCommerce capabilities.'} onSave={(val) => updatePersonalInfo('pluginsPageDescription', val)} multiline />
              </div>
            </motion.div>
          </div>

          {/* Plugins List */}
          <div className="space-y-12 mb-32">
            {plugins.map((plugin, idx) => (
              <motion.div 
                key={plugin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 rounded-[3rem] p-8 md:p-12 hover:bg-white/[0.06] transition-all duration-500"
              >
                {isEditMode && (
                  <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                    <button 
                      onClick={(e) => handleEdit(e, plugin)}
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-lg transition-transform hover:scale-105"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, plugin.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition-transform hover:scale-105"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  {/* Visual Side */}
                  <div className="lg:col-span-5 h-full min-h-[250px] relative rounded-2xl overflow-hidden border border-white/5 bg-slate-900 shadow-md">
                    <img 
                      src={plugin.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070'} 
                      alt={plugin.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 absolute inset-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* WP Badges */}
                    <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-3">
                      <span className="flex items-center gap-1 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold">
                        <Download size={14} className="text-blue-400" /> {plugin.activeInstalls || '1,000+'} Active
                      </span>
                      <span className="flex items-center gap-1 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" /> {plugin.rating || '5.0/5'}
                      </span>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="lg:col-span-7 flex flex-col justify-between h-full">
                    <div>
                      <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight group-hover:text-blue-400 transition-colors duration-300">{plugin.title}</h3>
                      <p className="text-slate-300 mb-6 leading-relaxed text-base md:text-lg">{plugin.shortDescription}</p>
                      
                      {/* Deep Details */}
                      <p className="text-slate-400 mb-8 leading-relaxed text-sm">{plugin.fullDescription}</p>

                      {/* Features */}
                      {plugin.features && plugin.features.length > 0 && (
                        <div className="mb-8">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Core Benefits & Features</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {plugin.features.map((feature: string, fIdx: number) => (
                              <div key={fIdx} className="flex items-start gap-2.5 text-sm text-slate-300">
                                <CheckCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-white/5">
                      {plugin.downloadLink && (
                        <a 
                          href={plugin.downloadLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full transition-all text-sm flex items-center gap-2 shadow-lg hover:shadow-blue-500/20 active:scale-95 duration-200"
                        >
                          One-Click Download <Download size={14} />
                        </a>
                      )}
                      
                      {plugin.liveLink && (
                        <a 
                          href={plugin.liveLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-slate-200 transition-all text-sm flex items-center gap-2"
                        >
                          Visit Plugin Website <ExternalLink size={14} />
                        </a>
                      )}
                      
                      {plugin.wpOrgLink && (
                        <a 
                          href={plugin.wpOrgLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-6 py-3 border border-white/20 hover:bg-white/5 font-semibold rounded-full transition-all text-sm flex items-center gap-2 text-slate-300 hover:text-white"
                        >
                          wp.org Directory <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-white/10 rounded-[3rem] p-12 md:p-20 text-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">Need a custom feature?</h2>
              <div className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Whether you need to customize an existing plugin, integrate custom hooks, or build a bespoke WooCommerce module, I can craft the exact PHP or custom solution you require.
              </div>
              <button 
                onClick={() => onNavigate('/portfolio/contact')}
                className="bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                Let's discuss my plugin idea <ArrowRight size={20} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <PortfolioFooter />
      <PluginModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingPlugin} 
      />
    </div>
  );
}
