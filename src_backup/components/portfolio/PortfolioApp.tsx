import React, { useState, useEffect } from 'react';
import { PublicPortfolio } from './PublicPortfolio';
import { ProjectDetails } from './ProjectDetails';
import { ServiceDetails } from './ServiceDetails';
import { AboutPage } from './AboutPage';
import { ServicesPage } from './ServicesPage';
import { ProjectsPage } from './ProjectsPage';
import { ContactPage } from './ContactPage';
import { PortfolioProvider, usePortfolio } from '../../context/PortfolioContext';
import { AdminBar } from './editor/AdminBar';
import { Loader2 } from 'lucide-react';

function PortfolioRouter({ initialPath, onNavigate }: { initialPath: string, onNavigate: (path: string) => void }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const { isEditMode, isLoading } = usePortfolio();

  useEffect(() => {
    setCurrentPath(initialPath);
  }, [initialPath]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    const search = window.location.search;
    onNavigate(search ? `${path}${search}` : path);
  };

  const handleBack = () => {
    handleNavigate('/portfolio');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const renderContent = () => {
    if (currentPath === '/portfolio/about') {
      return <AboutPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/portfolio/services') {
      return <ServicesPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/portfolio/projects') {
      return <ProjectsPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/portfolio/contact') {
      return <ContactPage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/portfolio/project/')) {
      const id = currentPath.split('/portfolio/project/')[1];
      return <ProjectDetails id={id} onBack={handleBack} />;
    }

    if (currentPath.startsWith('/portfolio/service/')) {
      const id = currentPath.split('/portfolio/service/')[1];
      return <ServiceDetails id={id} onBack={handleBack} />;
    }

    return <PublicPortfolio onNavigate={handleNavigate} />;
  };

  return (
    <div>
      <AdminBar onExit={() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }} />
      {renderContent()}
    </div>
  );
}

export function PortfolioApp({ initialPath, onNavigate }: { initialPath: string, onNavigate: (path: string) => void }) {
  const isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
  
  return (
    <PortfolioProvider initialEditMode={isEditMode}>
      <PortfolioRouter initialPath={initialPath} onNavigate={onNavigate} />
    </PortfolioProvider>
  );
}
