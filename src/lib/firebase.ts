import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Only initialize if we have the config
const isConfigured = !!firebaseConfig.apiKey;

export const app = isConfigured && !getApps().length ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export { isConfigured };

