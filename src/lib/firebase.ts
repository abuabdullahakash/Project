import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Safely load firebase-applet-config.json if present without failing build if gitignored/missing
const rawConfigs = import.meta.glob('../../firebase-applet-config.json', { eager: true }) as Record<string, { default?: Record<string, string> }>;
const firebaseConfigJSON = Object.values(rawConfigs)[0]?.default || {};

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJSON?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJSON?.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJSON?.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJSON?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJSON?.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJSON?.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJSON?.firestoreDatabaseId,
};

// Only initialize if we have the config
const isConfigured = !!config.apiKey && config.apiKey !== "your_api_key";

export const app = isConfigured && !getApps().length ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app, config.firestoreDatabaseId) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export { isConfigured };

