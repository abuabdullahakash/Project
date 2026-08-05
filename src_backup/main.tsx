import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ProjectProvider } from './context/ProjectContext';
import { AuthProvider } from './context/AuthContext';
import { GlobalNotesProvider } from './context/GlobalNotesContext';
import { ThemeProvider } from './context/ThemeContext';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('ServiceWorker registration failed: ', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <GlobalNotesProvider>
            <App />
          </GlobalNotesProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);

