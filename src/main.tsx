import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider } from './context/AuthContext';
import { GlobalNotesProvider } from './context/GlobalNotesContext';
import { ThemeProvider } from './context/ThemeContext';
import { MasterDeleteProvider } from './context/MasterDeleteContext';

if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('ServiceWorker registered successfully with scope:', reg.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
      });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MasterDeleteProvider>
          <ProjectProvider>
            <GlobalNotesProvider>
              <App />
            </GlobalNotesProvider>
          </ProjectProvider>
        </MasterDeleteProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);

