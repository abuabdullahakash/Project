import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface ProjectChat {
  id: string;
  name: string;
  chatId: string;
}

export interface NotifierSettingsType {
  enabled: boolean;
  globalBotToken: string;
  globalChatId: string;
  projectChats: ProjectChat[];
  messageTemplate?: string;
  templateConfig?: {
    header?: string;
    defaultTitle?: string;
    defaultClient?: string;
    defaultStage?: string;
    defaultPriority?: string;
    footerText?: string;
  };
}

export function useNotifierSettings() {
  const [settings, setSettings] = useState<NotifierSettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'settings', 'notifier');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            enabled: data.enabled ?? true,
            globalBotToken: '8983135896:AAFPPlz1ohjYvFbPSkbtDA81Qb-Zk451cFs',
            globalChatId: data.globalChatId || '',
            projectChats: data.projectChats || [],
            messageTemplate: data.messageTemplate,
            templateConfig: data.templateConfig
          });
        }
      } catch (error) {
        console.error('Error fetching notifier settings:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSettings();
  }, []);

  return { settings, loading };
}
