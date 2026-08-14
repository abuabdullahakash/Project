import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Unlock, Eye, EyeOff, Copy, Check, Shield, ShieldCheck, 
  Plus, Trash2, Edit3, Search, Filter, RefreshCw, KeyRound, 
  ChevronRight, ArrowRight, X, Sparkles, AlertTriangle, Key, Info, CheckSquare, ExternalLink,
  List, LayoutGrid, Globe, Clock, ChevronDown
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import { BrandLogo } from './BrandLogo';
import { PasswordAccordionItem, PasswordEntry } from './PasswordAccordionItem';

// Helper for SHA-256 Hashing (Native Web Crypto API)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// AES-256-GCM Encryption Helper using Web Crypto API
async function encryptText(text: string, keyText: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const rawKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(keyText),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    const salt = enc.encode("ProjectHubSaltSecret321"); // Consistent salt for derivation
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 1000,
        hash: "SHA-256"
      },
      rawKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(text)
    );
    
    const decryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + decryptedArray.length);
    combined.set(iv);
    combined.set(decryptedArray, iv.length);
    
    return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error("Encryption error:", err);
    return text;
  }
}

// AES-256-GCM Decryption Helper
async function decryptText(hexText: string, keyText: string): Promise<string> {
  try {
    if (!hexText || hexText.length < 24) return "";
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    
    const combined = new Uint8Array(hexText.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const rawKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(keyText),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    const salt = enc.encode("ProjectHubSaltSecret321");
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 1000,
        hash: "SHA-256"
      },
      rawKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData
    );
    
    return dec.decode(decrypted);
  } catch (err) {
    console.error("Decryption error:", err);
    return "";
  }
}

export function PasswordManager() {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Core Lock state
  const [isLocked, setIsLocked] = useState(true);
  const [hasLockConfig, setHasLockConfig] = useState<boolean | null>(null);
  const [lockType, setLockType] = useState<'pin' | 'password'>('pin');
  const [lockHash, setLockHash] = useState<string>('');
  
  // PIN pad / Password unlock inputs
  const [unlockInput, setUnlockInput] = useState<string>('');
  const [isWrongUnlock, setIsWrongUnlock] = useState(false);
  
  // Setup fields
  const [setupStep, setSetupStep] = useState<'choose' | 'input' | 'confirm'>('choose');
  const [setupLockType, setSetupLockType] = useState<'pin' | 'password'>('pin');
  const [setupInput, setSetupInput] = useState<string>('');
  const [setupConfirmInput, setSetupConfirmInput] = useState<string>('');

  // Password Entries
  const [rawEntries, setRawEntries] = useState<any[]>([]);
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Master decryption key (user entered PIN/password)
  const [masterKey, setMasterKey] = useState<string>('');

  // Filtering / Search & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'accordion' | 'grid'>('accordion');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Edit / Add Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isChangeLockOpen, setIsChangeLockOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  
  const [modalTitle, setModalTitle] = useState('');
  const [modalUsername, setModalUsername] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalUrl, setModalUrl] = useState('');
  const [modalCategory, setModalCategory] = useState('Personal');
  const [modalNotes, setModalNotes] = useState('');

  // Password Generator Modal / Section in Add Dialog
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPasswordResult, setGeneratedPasswordResult] = useState('');
  const [showMainGenerator, setShowMainGenerator] = useState(false);

  const categories = ['All', 'Personal', 'Social', 'Email', 'Work', 'Financial', 'Other'];

  // 1. Fetch user lock setup from Firestore
  useEffect(() => {
    if (!user || !db) return;

    const fetchLockConfig = async () => {
      try {
        const userSecretsRef = doc(db, 'userSecrets', user.uid);
        const docSnap = await getDoc(userSecretsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.lockHash && data.lockType) {
            setHasLockConfig(true);
            setLockType(data.lockType);
            setLockHash(data.lockHash);
            setRawEntries(data.passwords || []);
          } else {
            setHasLockConfig(false);
          }
        } else {
          setHasLockConfig(false);
        }
      } catch (err) {
        console.error("Error loading secure configs:", err);
        setHasLockConfig(false);
      }
    };

    fetchLockConfig();
  }, [user]);

  // Lock again whenever component unmounts for high security
  useEffect(() => {
    return () => {
      setIsLocked(true);
      setMasterKey('');
      setDecryptedPasswords({});
    };
  }, []);

  // Compute Password Strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-500' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  // Generate a random password
  const generatePassword = () => {
    let chars = '';
    if (genUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (genNumbers) chars += '0123456789';
    if (genSymbols) chars += '!@#$%^&*()_+~`|}{[]:;?><,./-="';
    
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    let pass = '';
    for (let i = 0; i < genLength; i++) {
      const randIdx = Math.floor(Math.random() * chars.length);
      pass += chars[randIdx];
    }
    setGeneratedPasswordResult(pass);
    toast.success("নতুন পাসওয়ার্ড তৈরি করা হয়েছে! (New secure password generated!)");
  };

  // Setup master lock
  const handleSetupLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupInput !== setupConfirmInput) {
      toast.error("Confirm input does not match!");
      return;
    }

    if (setupLockType === 'pin' && setupInput.length !== 4) {
      toast.error("PIN must be exactly 4 digits!");
      return;
    }

    if (setupLockType === 'password' && setupInput.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }

    try {
      const hashed = await sha256(setupInput);
      if (!user || !db) return;

      const userSecretsRef = doc(db, 'userSecrets', user.uid);
      await setDoc(userSecretsRef, {
        lockType: setupLockType,
        lockHash: hashed,
        passwords: []
      }, { merge: true });

      setLockType(setupLockType);
      setLockHash(hashed);
      setHasLockConfig(true);
      setMasterKey(setupInput);
      setIsLocked(false);
      toast.success("Secure Lock PIN/Password configured successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save lock settings.");
    }
  };

  // Unlock password manager
  const handleUnlock = async (val?: string) => {
    const code = val !== undefined ? val : unlockInput;
    if (!code) return;

    const hash = await sha256(code);
    if (hash === lockHash) {
      setMasterKey(code);
      setIsLocked(false);
      setUnlockInput('');
      setIsWrongUnlock(false);
      toast.success("Vault Unlocked Successfully", { icon: "🔑" });
      
      // Attempt to decrypt existing entries right away with the verified master key
      const decMap: Record<string, string> = {};
      for (const entry of rawEntries) {
        if (entry.passwordEncrypted) {
          const dec = await decryptText(entry.passwordEncrypted, code);
          decMap[entry.id] = dec;
        }
      }
      setDecryptedPasswords(decMap);
    } else {
      setIsWrongUnlock(true);
      setUnlockInput('');
      toast.error("Incorrect Lock PIN/Password");
      setTimeout(() => setIsWrongUnlock(false), 500);
    }
  };

  // Trigger unlock for numeric keypad click
  const handleKeypadClick = (num: string) => {
    if (unlockInput.length >= 4 && lockType === 'pin') return;
    const nextVal = unlockInput + num;
    setUnlockInput(nextVal);
    if (lockType === 'pin' && nextVal.length === 4) {
      // Auto submit PIN on reaching 4 digits
      handleUnlock(nextVal);
    }
  };

  // Save/Edit password entry
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle || !modalUsername || !modalPassword) {
      toast.error("Please fill in all required fields!");
      return;
    }

    try {
      const encrypted = await encryptText(modalPassword, masterKey);
      
      let updatedList = [...rawEntries];
      if (editingEntry) {
        // Edit mode
        updatedList = updatedList.map(item => {
          if (item.id === editingEntry.id) {
            return {
              ...item,
              title: modalTitle,
              username: modalUsername,
              passwordEncrypted: encrypted,
              url: modalUrl,
              category: modalCategory,
              notes: modalNotes,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
      } else {
        // Add mode
        const newEntry: PasswordEntry = {
          id: Date.now().toString(),
          title: modalTitle,
          username: modalUsername,
          passwordEncrypted: encrypted,
          url: modalUrl,
          category: modalCategory,
          notes: modalNotes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedList.push(newEntry);
      }

      // Save to Firestore
      if (user && db) {
        const userSecretsRef = doc(db, 'userSecrets', user.uid);
        await setDoc(userSecretsRef, {
          passwords: updatedList
        }, { merge: true });
      }

      setRawEntries(updatedList);
      
      // Update decrypt map locally
      setDecryptedPasswords(prev => ({
        ...prev,
        [editingEntry ? editingEntry.id : updatedList[updatedList.length - 1].id]: modalPassword
      }));

      setIsModalOpen(false);
      setEditingEntry(null);
      toast.success(editingEntry ? "Credentials updated" : "Credentials saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving.");
    }
  };

  // Delete password entry
  const handleDeleteEntry = async (id: string) => {
    try {
      const updatedList = rawEntries.filter(item => item.id !== id);
      if (user && db) {
        const userSecretsRef = doc(db, 'userSecrets', user.uid);
        await setDoc(userSecretsRef, {
          passwords: updatedList
        }, { merge: true });
      }
      setRawEntries(updatedList);
      
      // Clean up decrypted map
      const updatedDec = { ...decryptedPasswords };
      delete updatedDec[id];
      setDecryptedPasswords(updatedDec);

      toast.success("Credentials deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete credentials.");
    }
  };

  // Change lock configuration
  const handleChangeLockConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupInput !== setupConfirmInput) {
      toast.error("Passwords do not match!");
      return;
    }
    if (setupLockType === 'pin' && setupInput.length !== 4) {
      toast.error("PIN must be exactly 4 digits!");
      return;
    }
    if (setupLockType === 'password' && setupInput.length < 6) {
      toast.error("Password must be at least 6 characters!");
      return;
    }

    try {
      const hashed = await sha256(setupInput);
      
      // Recrypt ALL passwords with the NEW lock/password key!
      const newPasswords = [];
      const newDecMap: Record<string, string> = {};

      for (const entry of rawEntries) {
        // Decrypt with old masterKey
        const rawPass = decryptedPasswords[entry.id] || await decryptText(entry.passwordEncrypted, masterKey);
        // Recrypt with new setupInput key
        const newEnc = await encryptText(rawPass, setupInput);
        newPasswords.push({
          ...entry,
          passwordEncrypted: newEnc
        });
        newDecMap[entry.id] = rawPass;
      }

      if (user && db) {
        const userSecretsRef = doc(db, 'userSecrets', user.uid);
        await setDoc(userSecretsRef, {
          lockType: setupLockType,
          lockHash: hashed,
          passwords: newPasswords
        }, { merge: true });
      }

      setLockType(setupLockType);
      setLockHash(hashed);
      setMasterKey(setupInput);
      setRawEntries(newPasswords);
      setDecryptedPasswords(newDecMap);
      
      setIsChangeLockOpen(false);
      setSetupInput('');
      setSetupConfirmInput('');
      toast.success("Security configuration changed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update security configuration.");
    }
  };

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingEntry(null);
    setModalTitle('');
    setModalUsername('');
    setModalPassword('');
    setModalUrl('');
    setModalCategory('Personal');
    setModalNotes('');
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (entry: PasswordEntry) => {
    setEditingEntry(entry);
    setModalTitle(entry.title);
    setModalUsername(entry.username);
    setModalPassword(decryptedPasswords[entry.id] || '');
    setModalUrl(entry.url || '');
    setModalCategory(entry.category || 'Personal');
    setModalNotes(entry.notes || '');
    setIsModalOpen(true);
  };

  // Copy helper
  const handleCopyToClipboard = (text: string, id: string, type: 'Username' | 'Password') => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${id}-${type}`);
    toast.success(`${type} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Search and Category filtering
  const filteredEntries = rawEntries.filter(entry => {
    const titleMatch = entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       entry.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       entry.url?.toLowerCase().includes(searchQuery.toLowerCase());
    const categoryMatch = selectedCategory === 'All' || entry.category === selectedCategory;
    return titleMatch && categoryMatch;
  });

  return (
    <div className={`w-full min-h-[70vh] rounded-2xl sm:rounded-3xl p-3 sm:p-6 lg:p-8 transition-all ${
      theme === 'dark' ? 'bg-[#0f172a] text-slate-200' : 'bg-white text-slate-800'
    }`}>
      
      {/* 1. SETUP LOCK CONFIG (If user hasn't set up lock pin or password yet) */}
      {hasLockConfig === false && (
        <div className="min-h-[60vh] flex flex-col justify-center items-center w-full my-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`max-w-md w-full rounded-2xl p-5 sm:p-6 border shadow-xl flex flex-col gap-6 text-center ${
              theme === 'dark' ? 'bg-slate-900 border-white/5 shadow-black/40' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg">
              <Lock size={26} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Configure Secure Lock</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Setup a lock method to safeguard your secure accounts and passwords. Every time you open this section, you'll be asked for this PIN/Password.
              </p>
            </div>

            {setupStep === 'choose' && (
              <div className="flex flex-col gap-3 mt-2">
                <button 
                  onClick={() => { setSetupLockType('pin'); setSetupStep('input'); }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Key size={18} /> Setup 4-Digit Security PIN
                </button>
                <button 
                  onClick={() => { setSetupLockType('password'); setSetupStep('input'); }}
                  className={`w-full font-semibold py-3 sm:py-3.5 rounded-xl transition-all border flex items-center justify-center gap-2 text-xs sm:text-sm ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <KeyRound size={18} /> Setup Alphanumeric Password
                </button>
              </div>
            )}

            {setupStep === 'input' && (
              <div className="flex flex-col gap-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Step 1: Create your lock {setupLockType === 'pin' ? 'PIN' : 'Password'}
                </p>
                <input 
                  type={setupLockType === 'pin' ? 'number' : 'password'}
                  maxLength={setupLockType === 'pin' ? 4 : 32}
                  placeholder={setupLockType === 'pin' ? 'e.g. 1234' : 'Password (min 6 chars)'}
                  value={setupInput}
                  onChange={(e) => setSetupInput(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-center text-lg tracking-widest font-bold focus:outline-none focus:ring-1 transition-all ${
                    theme === 'dark' ? 'bg-black/50 border-white/10 text-white focus:border-red-500 focus:ring-red-500' : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
                <button 
                  disabled={setupLockType === 'pin' ? setupInput.length !== 4 : setupInput.length < 6}
                  onClick={() => setSetupStep('confirm')}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-all shadow-md disabled:opacity-50 text-xs sm:text-sm"
                >
                  Continue
                </button>
                <button 
                  onClick={() => { setSetupStep('choose'); setSetupInput(''); }}
                  className="text-slate-400 hover:text-white transition-colors text-xs text-center mt-1 font-medium"
                >
                  Go Back
                </button>
              </div>
            )}

            {setupStep === 'confirm' && (
              <form onSubmit={handleSetupLock} className="flex flex-col gap-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Step 2: Confirm your lock {setupLockType === 'pin' ? 'PIN' : 'Password'}
                </p>
                <input 
                  type={setupLockType === 'pin' ? 'number' : 'password'}
                  maxLength={setupLockType === 'pin' ? 4 : 32}
                  placeholder={setupLockType === 'pin' ? 'Re-enter PIN' : 'Re-enter Password'}
                  value={setupConfirmInput}
                  onChange={(e) => setSetupConfirmInput(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-center text-lg tracking-widest font-bold focus:outline-none focus:ring-1 transition-all ${
                    theme === 'dark' ? 'bg-black/50 border-white/10 text-white focus:border-red-500 focus:ring-red-500' : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-red-500'
                  }`}
                />
                <button 
                  type="submit"
                  disabled={setupConfirmInput !== setupInput}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all shadow-md disabled:opacity-50 text-xs sm:text-sm"
                >
                  Confirm & Create Lock
                </button>
                <button 
                  type="button"
                  onClick={() => { setSetupStep('input'); setSetupConfirmInput(''); }}
                  className="text-slate-400 hover:text-white transition-colors text-xs text-center mt-1 font-medium"
                >
                  Back to edit
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* 2. LOCKED SCREEN (If lock config exists, prompt for PIN/Password entry) */}
      {hasLockConfig === true && isLocked && (
        <div className="min-h-[60vh] flex flex-col justify-center items-center w-full my-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center"
          >
            <motion.div 
              animate={isWrongUnlock ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-xl mb-4 sm:mb-6 shadow-red-500/10"
            >
              <Lock size={28} className="sm:w-8 sm:h-8" />
            </motion.div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Vault Locked</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xs mb-6 sm:mb-8">
              Enter your secure {lockType === 'pin' ? 'PIN' : 'Password'} to decrypt and access your credentials database.
            </p>

            {/* Unlock Controls */}
            {lockType === 'pin' ? (
              <div className="w-full max-w-xs flex flex-col items-center gap-5 sm:gap-6">
                {/* PIN Bubbles Display */}
                <div className="flex gap-3 sm:gap-4 justify-center my-1 sm:my-2">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border transition-all duration-300 ${
                        unlockInput.length > i 
                          ? 'bg-red-500 border-red-500 scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                          : theme === 'dark' ? 'border-white/20 bg-transparent' : 'border-slate-300 bg-transparent'
                      }`}
                    />
                  ))}
                </div>

                {/* Numeric Pad Grid */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full px-1 sm:px-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      onClick={() => handleKeypadClick(num)}
                      className={`h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-lg sm:text-xl active:scale-95 transition-all ${
                        theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-white' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  
                  {/* Backspace Button */}
                  <button
                    onClick={() => setUnlockInput(prev => prev.slice(0, -1))}
                    className={`h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm active:scale-95 transition-all ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    Clear
                  </button>
                  
                  {/* Zero Button */}
                  <button
                    onClick={() => handleKeypadClick('0')}
                    className={`h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-lg sm:text-xl active:scale-95 transition-all ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-white' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    0
                  </button>

                  {/* Reset PIN display button */}
                  <button
                    onClick={() => setUnlockInput('')}
                    className="h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-[11px] sm:text-xs uppercase font-bold tracking-wider text-slate-400 hover:text-white active:scale-95 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => { e.preventDefault(); handleUnlock(); }}
                className="w-full max-w-sm flex flex-col gap-4"
              >
                <div className="relative">
                  <input 
                    type="password"
                    placeholder="Password"
                    value={unlockInput}
                    onChange={(e) => setUnlockInput(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 sm:py-3.5 pr-12 focus:outline-none focus:ring-1 text-sm transition-all ${
                      theme === 'dark' ? 'bg-black/50 border-white/10 text-white focus:border-red-500 focus:ring-red-500' : 'bg-white border-slate-300 text-slate-900 focus:border-red-500 focus:ring-red-500'
                    }`}
                  />
                  <button 
                    type="submit"
                    className="absolute right-3.5 top-2.5 sm:top-3 text-red-500 hover:text-red-400 p-1"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* 3. UNLOCKED MAIN SECURE BOARD */}
      {hasLockConfig === true && !isLocked && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full flex flex-col gap-5 sm:gap-6"
        >
          {/* Top Panel / Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/5 pb-4 sm:pb-6">
            <div>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Personal Passwords Manager</h1>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" /> High-Grade End-to-End AES-256 Encryption Active
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => { setSetupStep('choose'); setSetupInput(''); setSetupConfirmInput(''); setIsChangeLockOpen(true); }}
                className={`flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <KeyRound size={14} className="shrink-0" /> <span className="truncate">Change Lock</span>
              </button>
              <button
                onClick={() => { setIsLocked(true); setMasterKey(''); setDecryptedPasswords({}); }}
                className="flex-1 sm:flex-initial justify-center bg-red-600 hover:bg-red-500 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all shrink-0"
              >
                <Lock size={14} className="shrink-0" /> Lock Vault
              </button>
            </div>
          </div>

          {/* Search, Filter, View Mode & Add Row */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search by app, email or site URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-1 transition-all ${
                    theme === 'dark' ? 'bg-white/[0.02] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Category selector */}
              <div className="relative sm:w-44">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2 sm:py-2.5 text-xs sm:text-sm appearance-none pr-8 focus:outline-none transition-all ${
                    theme === 'dark' ? 'bg-white/[0.02] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat} className={theme === 'dark' ? 'bg-[#1e293b] text-white' : 'bg-white text-slate-800'}>{cat}</option>
                  ))}
                </select>
                <Filter size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* View Mode Toggle: Accordion vs Grid */}
              <div className={`flex items-center rounded-xl p-1 border shrink-0 ${
                theme === 'dark' ? 'bg-white/[0.02] border-white/10' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('accordion')}
                  title="List / Accordion View"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'accordion'
                      ? 'bg-red-500 text-white shadow-sm'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List size={15} />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid Cards View"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-red-500 text-white shadow-sm'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid size={15} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2 sm:gap-2.5">
              <button
                onClick={() => {
                  const nextVal = !showMainGenerator;
                  setShowMainGenerator(nextVal);
                  if (nextVal && !generatedPasswordResult) {
                    setTimeout(generatePassword, 50);
                  }
                }}
                className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md text-xs sm:text-sm ${
                  showMainGenerator 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                    : theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <Sparkles size={16} className="shrink-0" /> <span>Password Generator</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md text-xs sm:text-sm shrink-0"
              >
                <Plus size={18} className="shrink-0" /> <span>Add New Credentials</span>
              </button>
            </div>
          </div>

          {/* Collapsible Password Generator Panel */}
          <AnimatePresence>
            {showMainGenerator && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={`p-4 sm:p-6 rounded-2xl border ${
                  theme === 'dark' 
                    ? 'bg-slate-900/80 border-white/10 shadow-lg shadow-black/30' 
                    : 'bg-slate-50 border-slate-200 shadow-sm'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 sm:gap-6">
                    {/* Left: Interactive Controls */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={18} className="text-amber-500 animate-pulse shrink-0" />
                        <h3 className="font-bold text-sm sm:text-base">Secure Password Generator (পাসওয়ার্ড জেনারেটর)</h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        এখানে আপনার পছন্দের দৈর্ঘ্য ও অপশন বেছে নিয়ে একটি নিরাপদ পাসওয়ার্ড তৈরি করতে পারেন। সেটি কপি করে আপনার একাউন্টে বসাতে পারবেন। (Generate a secure password here, copy it and paste it to your accounts).
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium shrink-0">Length: <span className="text-amber-500 font-bold">{genLength}</span> chars</span>
                          <input 
                            type="range" 
                            min={8} 
                            max={32} 
                            value={genLength} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setGenLength(val);
                            }}
                            className="flex-1 max-w-[180px] accent-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs font-semibold text-slate-400">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={genUpper} onChange={(e) => setGenUpper(e.target.checked)} className="rounded text-amber-500 bg-transparent border-white/20 focus:ring-amber-500" />
                            Uppercase (A-Z)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={genLower} onChange={(e) => setGenLower(e.target.checked)} className="rounded text-amber-500 bg-transparent border-white/20 focus:ring-amber-500" />
                            Lowercase (a-z)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} className="rounded text-amber-500 bg-transparent border-white/20 focus:ring-amber-500" />
                            Numbers (0-9)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} className="rounded text-amber-500 bg-transparent border-white/20 focus:ring-amber-500" />
                            Symbols (&*#)
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={generatePassword}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
                      >
                        <RefreshCw size={13} /> Generate New Secure Password
                      </button>
                    </div>

                    {/* Right: Output Screen & Copy Button */}
                    <div className={`w-full lg:w-80 p-4 sm:p-5 rounded-xl border flex flex-col justify-between gap-3 sm:gap-4 shrink-0 ${
                      theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'
                    }`}>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Generated Result</span>
                        <div className="relative">
                          <input 
                            type="text" 
                            readOnly 
                            value={generatedPasswordResult}
                            placeholder="Click Generate"
                            className={`w-full font-mono text-center text-xs sm:text-sm font-bold select-all pr-10 py-2.5 sm:py-3 rounded-lg border focus:outline-none ${
                              theme === 'dark' ? 'bg-black/60 border-white/10 text-amber-400' : 'bg-slate-50 border-slate-200 text-amber-600'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (generatedPasswordResult) {
                                navigator.clipboard.writeText(generatedPasswordResult);
                                toast.success("পাসওয়ার্ড কপি করা হয়েছে! (Password copied to clipboard!)");
                              }
                            }}
                            className="absolute right-3 top-2.5 sm:top-3 text-slate-400 hover:text-white transition-colors"
                            title="Copy Password"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>

                      {generatedPasswordResult && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span>STRENGTH</span>
                            <span className="text-amber-500">{getPasswordStrength(generatedPasswordResult).label}</span>
                          </div>
                          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getPasswordStrength(generatedPasswordResult).color}`} 
                              style={{ width: `${(getPasswordStrength(generatedPasswordResult).score / 6) * 100}%` }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Credentials List: Accordion vs Grid */}
          {filteredEntries.length === 0 ? (
            <div className={`text-center py-12 sm:py-16 rounded-3xl border ${
              theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-base sm:text-lg">No passwords found</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                {searchQuery || selectedCategory !== 'All' 
                  ? 'Try modifying your search query or filters.' 
                  : 'Start securing your credentials! Click "Add New Credentials" above.'}
              </p>
            </div>
          ) : viewMode === 'accordion' ? (
            /* ACCORDION LIST VIEW */
            <div className="space-y-2.5 sm:space-y-3">
              {filteredEntries.map((entry) => {
                const decValue = decryptedPasswords[entry.id] || '';
                const isExpanded = !!expandedIds[entry.id];

                return (
                  <PasswordAccordionItem
                    key={entry.id}
                    entry={entry}
                    decryptedPassword={decValue}
                    theme={theme}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpand(entry.id)}
                    onEdit={handleOpenEdit}
                    onDelete={(id) => {
                      if (confirm("Are you sure you want to delete these credentials? This is irreversible.")) {
                        handleDeleteEntry(id);
                      }
                    }}
                    getPasswordStrength={getPasswordStrength}
                  />
                );
              })}
            </div>
          ) : (
            /* MODERN GRID CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredEntries.map((entry) => {
                const decValue = decryptedPasswords[entry.id] || '';
                const strength = getPasswordStrength(decValue);
                const isShowing = showPasswordMap[entry.id] || false;

                return (
                  <motion.div
                    key={entry.id}
                    layoutId={`entry-card-${entry.id}`}
                    className={`group relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 ${
                      theme === 'dark' 
                        ? 'bg-slate-900/80 hover:bg-slate-900 border-white/5 hover:border-white/10 shadow-lg' 
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Brand Logo, Title & Category Badge */}
                      <div className="flex items-start justify-between gap-2.5 mb-3.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <BrandLogo title={entry.title} url={entry.url} size="sm" />
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-bold text-sm sm:text-base tracking-tight truncate ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}>
                              {entry.title}
                            </h3>
                            {entry.url && (
                              <a 
                                href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors mt-0.5 truncate max-w-full"
                              >
                                <span className="truncate">{entry.url.replace(/^https?:\/\//, '')}</span> <ExternalLink size={10} className="shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          theme === 'dark' ? 'bg-white/5 text-slate-300 border border-white/5' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {entry.category || 'General'}
                        </span>
                      </div>

                      {/* Username Section */}
                      <div className="space-y-1 mb-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username / Email</label>
                        <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs border ${
                          theme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="font-mono select-all truncate flex-1 min-w-0 pr-2">{entry.username}</span>
                          <button 
                            onClick={() => handleCopyToClipboard(entry.username, entry.id, 'Username')}
                            className={`p-1 rounded-lg transition-colors shrink-0 ${
                              copiedId === `${entry.id}-Username` ? 'text-emerald-500' : 'text-slate-400 hover:text-white'
                            }`}
                            title="Copy Username"
                          >
                            {copiedId === `${entry.id}-Username` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Password Section */}
                      <div className="space-y-1 mb-3.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Secure Password</label>
                        <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs border ${
                          theme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="font-mono select-all truncate flex-1 min-w-0 pr-2">
                            {isShowing ? (decValue || '••••••••') : '••••••••••••'}
                          </span>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => setShowPasswordMap(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                              className="p-1 text-slate-400 hover:text-white transition-colors"
                              title={isShowing ? 'Hide Password' : 'Show Password'}
                            >
                              {isShowing ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button 
                              onClick={() => handleCopyToClipboard(decValue, entry.id, 'Password')}
                              className={`p-1 transition-colors ${
                                copiedId === `${entry.id}-Password` ? 'text-emerald-500' : 'text-slate-400 hover:text-white'
                              }`}
                              title="Copy Password"
                            >
                              {copiedId === `${entry.id}-Password` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Password strength visualizer */}
                        {isShowing && (
                          <div className="flex items-center gap-2 mt-1 px-1">
                            <div className="flex-1 h-1 bg-slate-700/60 rounded-full overflow-hidden flex">
                              <div className={`h-full ${strength.color}`} style={{ width: `${(strength.score / 6) * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{strength.label}</span>
                          </div>
                        )}
                      </div>

                      {/* Description / Notes */}
                      {entry.notes && (
                        <p className={`text-xs p-2.5 rounded-xl border line-clamp-2 italic mb-3 ${
                          theme === 'dark' ? 'bg-white/[0.02] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          "{entry.notes}"
                        </p>
                      )}
                    </div>

                    {/* Footer - Actions */}
                    <div className="flex items-center justify-between border-t border-inherit pt-3 mt-auto">
                      <span className="text-[10px] text-slate-500">
                        {new Date(entry.updatedAt || entry.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className={`p-2 rounded-xl transition-all border ${
                            theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                          }`}
                          title="Edit Credentials"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if(confirm("Are you sure you want to delete these credentials? This is irreversible.")) {
                              handleDeleteEntry(entry.id);
                            }
                          }}
                          className="p-2 rounded-xl transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                          title="Delete Credentials"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* 4. MODAL: ADD / EDIT CREDENTIALS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-2xl my-auto rounded-2xl border shadow-2xl relative flex flex-col max-h-[92vh] ${
              theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold">{editingEntry ? 'Edit Credentials' : 'Add New Credentials'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
              <form id="credentials-form" onSubmit={handleSaveEntry} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Platform / App Name *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Google, GitHub, Netflix" 
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all ${
                        theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                    <select
                      value={modalCategory}
                      onChange={(e) => setModalCategory(e.target.value)}
                      className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all ${
                        theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat} className={theme === 'dark' ? 'bg-[#1e293b]' : ''}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Username / Email *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. user@gmail.com" 
                      value={modalUsername}
                      onChange={(e) => setModalUsername(e.target.value)}
                      className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all ${
                        theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Website URL (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. https://github.com" 
                      value={modalUrl}
                      onChange={(e) => setModalUrl(e.target.value)}
                      className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all ${
                        theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Secure Password *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Enter password or use generator below" 
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none tracking-wide font-mono transition-all ${
                      theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Custom Notes / Hints (Optional)</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. recovery key, hints, answer to security question" 
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all ${
                      theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <span className="text-[10px] text-amber-500 flex items-start sm:items-center gap-1.5 mt-1">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5 sm:mt-0" />
                    <span>এখানে পাসওয়ার্ড লিখবেন না। নোটস বা সংকেতগুলো প্লেইন টেক্সট হিসেবে সরাসরি কার্ডে দেখা যায়।</span>
                  </span>
                </div>
              </form>
            </div>

            <div className="p-4 sm:p-6 border-t border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-full sm:w-auto px-5 py-2.5 rounded-full font-semibold hover:bg-white/5 transition-colors text-xs text-center"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="credentials-form"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-2.5 rounded-full font-bold transition-all shadow-md text-xs uppercase tracking-wider text-center"
              >
                Save Credentials
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 5. MODAL: CHANGE SECURITY LOCK */}
      {isChangeLockOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md my-auto rounded-2xl border shadow-2xl p-4 sm:p-6 ${
              theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5 mb-4">
              <h2 className="text-base sm:text-lg font-bold">Change Vault Lock</h2>
              <button 
                onClick={() => setIsChangeLockOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangeLockConfig} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Lock Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setSetupLockType('pin'); setSetupInput(''); setSetupConfirmInput(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      setupLockType === 'pin' 
                        ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                        : theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    4-Digit Secure PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetupLockType('password'); setSetupInput(''); setSetupConfirmInput(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      setupLockType === 'password' 
                        ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                        : theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    Custom Password
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">New {setupLockType === 'pin' ? 'PIN' : 'Password'}</label>
                <input 
                  type={setupLockType === 'pin' ? 'number' : 'password'}
                  maxLength={setupLockType === 'pin' ? 4 : 32}
                  placeholder={setupLockType === 'pin' ? 'e.g. 1234' : 'Password (min 6 chars)'}
                  value={setupInput}
                  onChange={(e) => setSetupInput(e.target.value)}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all ${
                    theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-semibold">Confirm New {setupLockType === 'pin' ? 'PIN' : 'Password'}</label>
                <input 
                  type={setupLockType === 'pin' ? 'number' : 'password'}
                  maxLength={setupLockType === 'pin' ? 4 : 32}
                  placeholder={setupLockType === 'pin' ? 'Confirm PIN' : 'Confirm Password'}
                  value={setupConfirmInput}
                  onChange={(e) => setSetupConfirmInput(e.target.value)}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none transition-all ${
                    theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsChangeLockOpen(false)} 
                  className="w-full sm:w-auto px-4 py-2 rounded-full font-semibold hover:bg-white/5 transition-colors text-xs text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={setupInput !== setupConfirmInput || (setupLockType === 'pin' ? setupInput.length !== 4 : setupInput.length < 6)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-full font-bold transition-all text-xs uppercase tracking-wider disabled:opacity-50 text-center"
                >
                  Confirm Change
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
