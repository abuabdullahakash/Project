import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useMasterDelete } from '../context/MasterDeleteContext';
import { ElementorTemplate } from '../types';
import { uploadImageToImgBB } from '../lib/imgbb';
import LZString from 'lz-string';

export function useElementorTemplates() {
  const { user, isConfigured } = useAuth();
  const { requireMasterDelete } = useMasterDelete();
  const [templates, setTemplates] = useState<ElementorTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !user || !db) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'elementorTemplates'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const templatesData: ElementorTemplate[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as ElementorTemplate;
        if (data.isCompressed && data.jsonContent) {
          try {
            data.jsonContent = LZString.decompressFromUTF16(data.jsonContent) || data.jsonContent;
          } catch (e) {
            console.error("Failed to decompress template content:", e);
          }
        }
        templatesData.push(data);
      });
      // Sort by createdAt descending locally since we might not have an index
      templatesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTemplates(templatesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching templates:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isConfigured]);

  const uploadTemplate = async (
    title: string,
    category: string,
    jsonContent: string,
    screenshotFile?: File,
    liveUrl?: string
  ) => {
    if (!user || !db) throw new Error("Not authenticated or configured");

    const newDocRef = doc(collection(db, 'elementorTemplates'));
    const id = newDocRef.id;
    const timestamp = new Date().toISOString();

    // Compress the JSON content to avoid Firestore 1MB document size limit
    const compressedJson = LZString.compressToUTF16(jsonContent);

    // Upload Screenshot if provided
    let screenshotUrl = '';
    if (screenshotFile) {
      const url = await uploadImageToImgBB(screenshotFile);
      if (url) {
        screenshotUrl = url;
      } else {
        throw new Error("Failed to upload screenshot to ImgBB");
      }
    }

    const newTemplate: ElementorTemplate = {
      id,
      userId: user.uid,
      title,
      category,
      jsonContent: compressedJson,
      isCompressed: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (screenshotUrl) {
      newTemplate.screenshotUrl = screenshotUrl;
    }
    if (liveUrl) {
      newTemplate.liveUrl = liveUrl;
    }

    await setDoc(doc(db, 'elementorTemplates', id), newTemplate);
    
    // Return the uncompressed version for immediate local use
    return {
      ...newTemplate,
      jsonContent
    };
  };

  const deleteTemplate = async (template: ElementorTemplate) => {
    requireMasterDelete(async () => {
      if (!user || !db) throw new Error("Not authenticated or configured");

      // Delete document
      await deleteDoc(doc(db, 'elementorTemplates', template.id));
    });
  };

  return {
    templates,
    loading,
    uploadTemplate,
    deleteTemplate
  };
}
