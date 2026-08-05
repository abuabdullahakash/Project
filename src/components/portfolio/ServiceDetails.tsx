import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, LayoutTemplate, Database, Bot, ShoppingCart, ChevronRight, ArrowRight } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { PortfolioHeader, PortfolioFooter } from './PortfolioLayout';

const iconMap: Record<string, React.ElementType> = {
  LayoutTemplate,
  Database,
  Bot,
  ShoppingCart
};

export function ServiceDetails({ id, onBack }: { id: string, onBack: () => void }) {
  const { data } = usePortfolio();
  const service = data.services.find(s => s.id === id);
  const relatedServices = data.services.filter(s => s.id !== id).slice(0, 2);

  if (!service) return <div className="p-20 text-center text-white">Service not found.</div>;

  const Icon = iconMap[service.icon] || LayoutTemplate;

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
              window.history.pushState({}, '', '/portfolio/services');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }} className="hover:text-white transition-colors">Services</button>
            <ChevronRight size={14} />
            <span className="text-white">{service.title}</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex flex-col md:flex-row md:items-center gap-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Icon size={40} />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 leading-[1.1]">
                {service.title}
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed">
                {service.shortDescription}
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 mb-16"
          >
            <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
            <div className="md:col-span-2 space-y-16">
              {/* Overview */}
              <section>
                <h2 className="text-3xl font-bold tracking-tight mb-6">Service Overview</h2>
                <p className="text-lg text-slate-300 leading-relaxed">
                  {service.fullDescription}
                </p>
              </section>

              {/* Benefits */}
              {service.benefits && (
                <section>
                  <h2 className="text-3xl font-bold tracking-tight mb-8">Key Benefits</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {service.benefits.map((benefit, idx) => (
                      <div key={idx} className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-xl font-bold mb-3 text-white">{benefit.title}</h3>
                        <p className="text-slate-400 leading-relaxed">{benefit.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Process */}
              {service.process && (
                <section>
                  <h2 className="text-3xl font-bold tracking-tight mb-8">Our Process</h2>
                  <div className="space-y-6">
                    {service.process.map((step, idx) => (
                      <div key={idx} className="flex gap-6 p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                        <div className="text-4xl font-black text-white/10 select-none">
                          {step.step}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
                          <p className="text-slate-400 leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10 sticky top-28">
                <h3 className="text-xl font-bold mb-6">What's Included</h3>
                <ul className="space-y-4">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="text-blue-400 shrink-0 mt-0.5" size={20} />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-colors mt-8 flex items-center justify-center gap-2">
                  Request a Quote <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Related Services */}
          <section className="pt-20 border-t border-white/10">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Related Services</h2>
              <button onClick={onBack} className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-medium transition-colors">
                View All <ArrowRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedServices.map((relatedService) => {
                const RelatedIcon = iconMap[relatedService.icon] || LayoutTemplate;
                return (
                  <div 
                    key={relatedService.id}
                    className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      window.history.pushState({}, '', `/portfolio/service/${relatedService.id}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                      <RelatedIcon size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{relatedService.title}</h3>
                    <p className="text-slate-400 leading-relaxed mb-6 line-clamp-2">
                      {relatedService.shortDescription}
                    </p>
                    <div className="flex items-center gap-2 text-blue-400 font-medium group-hover:gap-4 transition-all">
                      Learn more <ArrowRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <PortfolioFooter />
    </div>
  );
}
