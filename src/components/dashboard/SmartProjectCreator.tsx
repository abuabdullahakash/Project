import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Link as LinkIcon, Loader2, X, AlertCircle, Save, Trash2, Info, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useProjects } from '../../hooks/useProjects';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

async function hashApiKey(key: string) {
  const msgUint8 = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function SmartProjectCreator() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [isSavedKey, setIsSavedKey] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [lastTokenCost, setLastTokenCost] = useState<number>(0);
  const [limitTokens, setLimitTokens] = useState<number>(100000);
  const [isFetchingUsage, setIsFetchingUsage] = useState(false);
  const [hashedKey, setHashedKey] = useState<string | null>(null);
  const { addProject } = useProjects();

  useEffect(() => {
    // Load api key from Firebase when component mounts or user changes
    const loadSavedKey = async () => {
      if (!user) return;
      try {
        const secretDocRef = doc(db, 'userSecrets', user.uid);
        const secretSnap = await getDoc(secretDocRef);
        if (secretSnap.exists()) {
          const key = secretSnap.data().groqApiKey;
          if (key) {
            setCustomApiKey(key);
            setIsSavedKey(true);
          }
        }
      } catch (err) {
        console.error("Failed to load saved API key from Firebase", err);
      }
    };
    loadSavedKey();
  }, [user]);

  const saveKeyToFirebase = async () => {
    if (!user) return;
    const keyToSave = customApiKey.trim();
    if (!keyToSave) return toast.error('Please enter an API key to save.');
    
    try {
      const secretDocRef = doc(db, 'userSecrets', user.uid);
      await setDoc(secretDocRef, { groqApiKey: keyToSave }, { merge: true });
      setIsSavedKey(true);
      toast.success('Your API key is securely saved to your account!');
    } catch (err) {
      console.error("Failed to save API key", err);
      toast.error('Failed to save API key.');
    }
  };

  const removeKeyFromFirebase = async () => {
    if (!showConfirmRemove) {
      setShowConfirmRemove(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setShowConfirmRemove(false), 3000);
      return;
    }
    if (!user) return;
    try {
      const secretDocRef = doc(db, 'userSecrets', user.uid);
      await updateDoc(secretDocRef, {
        groqApiKey: deleteField()
      });
      setCustomApiKey('');
      setIsSavedKey(false);
      setShowConfirmRemove(false);
      toast.success('API key removed from your account.');
    } catch (err) {
      // If doc doesn't exist, ignore
      setCustomApiKey('');
      setIsSavedKey(false);
      setShowConfirmRemove(false);
      toast.success('API key removed.');
    }
  };

  useEffect(() => {
    const fetchUsage = async () => {
      const key = customApiKey.trim();
      if (key.length < 15) {
        setTokensUsed(null);
        setHashedKey(null);
        return;
      }
      
      setIsFetchingUsage(true);
      try {
        const hash = await hashApiKey(key);
        setHashedKey(hash);
        const usageDocRef = doc(db, 'apiUsage', hash);
        const usageSnap = await getDoc(usageDocRef);
        
        const today = new Date().toISOString().split('T')[0];
        
        if (usageSnap.exists()) {
          const data = usageSnap.data();
          if (data.date === today) {
            setTokensUsed(data.tokensUsed || 0);
            setLastTokenCost(data.lastTokenCost || 3000);
            setLimitTokens(data.limitTokens || 100000);
          } else {
            // New day resets to 0
            setTokensUsed(0);
            setLastTokenCost(data.lastTokenCost || 3000);
            setLimitTokens(data.limitTokens || 100000);
          }
        } else {
          setTokensUsed(0);
          setLastTokenCost(3000); // assume ~3000 tokens initially
          setLimitTokens(100000); // 100K daily limit default
        }
      } catch (err) {
        console.error("Error fetching usage count:", err);
      } finally {
        setIsFetchingUsage(false);
      }
    };
    
    const timeoutId = setTimeout(fetchUsage, 600);
    return () => clearTimeout(timeoutId);
  }, [customApiKey]);

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please provide a Google Sheet link.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/fetch-sheet-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (!response.ok) {
          throw new Error(`Server returned an error (${response.status}). It might be a temporary hiccup. Please try again.`);
        }
        throw new Error('Received unexpected format from server instead of JSON.');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch sheet data.');
      }

      const { csvText } = data;


      const apiKeyToUse = customApiKey.trim();
      
      if (!apiKeyToUse) {
        throw new Error("No valid Groq API Key found. Please enter a custom Groq API Key below.");
      }

      const tokensUsedValue = tokensUsed || 0;
      if (tokensUsedValue >= limitTokens) {
        throw new Error(`Daily token limit reached (${limitTokens} tokens). Please try again tomorrow or use a different API key.`);
      }

      const prompt = `
      I have the following data from a Google Sheet that represents a project:
      
      ${csvText}
      
      Please extract all relevant information to create a new project. 
      Output the information STRICTLY as a JSON object matching this schema. Do NOT include markdown blocks, just the RAW JSON:
      {
        "title": "String - the project title",
        "clientName": "String - client name",
        "clientEmail": "String (optional)",
        "description": "String - full description of the project compiled from the sheet",
        "price": "Number - numeric value of the project price, default 0 if not found",
        "priority": "String - 'High', 'Medium', or 'Low'. Default 'Medium'",
        "startDate": "String - ISO date format YYYY-MM-DD. Use today if none.",
        "endDate": "String - ISO date format YYYY-MM-DD. Use next week if none.",
        "stage": "String - 'First Stage', 'Middle Stage', 'Final Stage', or 'Delivered'. Default 'First Stage'",
        "status": "String - 'Active', 'Revision', or 'Delivered'. Default 'Active'",
        "websiteLink": "String (optional)",
        "additionalLinks": [
          { "id": "uuid string", "title": "String", "url": "String" }
        ],
        "credentials": [
          { "id": "uuid string", "title": "String", "url": "String", "username": "String", "password": "password" }
        ]
      }
      
      Instructions:
      - Any generic resource link goes into 'additionalLinks' (e.g. drive links, reference links).
      - Any login information like WordPress, cPanel, or other login details goes into 'credentials'.
      - Put the general requirements into the 'description'.
      `;

      const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeyToUse}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 2048
        })
      });

      if (!aiResponse.ok) {
        let errDetails = "Unknown error";
        try {
          const errData = await aiResponse.json();
          errDetails = errData.error?.message || errData.detail || JSON.stringify(errData);
        } catch { }
        throw new Error(`Groq API Error: ${aiResponse.status} ${aiResponse.statusText} - ${errDetails}`);
      }

      const aiData = await aiResponse.json();
      const tokensSpentThisRequest = aiData.usage?.total_tokens || 3000;
      let jsonStr = aiData.choices?.[0]?.message?.content || "{}";
      jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      
      let parsedData;
      try {
        parsedData = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error('AI could not extract data properly. The Google Sheet format might be invalid, or it might be asking for a login instead of showing the sheet.');
      }

      if (url.trim()) {
        parsedData.additionalLinks = parsedData.additionalLinks || [];
        parsedData.additionalLinks.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          title: 'Google Sheet Form',
          url: url.trim()
        });
      }

      parsedData.projectType = 'client';

      await addProject(parsedData);
      
      // Update Firebase usage limit
      if (hashedKey) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const usageDocRef = doc(db, 'apiUsage', hashedKey);
          const usageSnap = await getDoc(usageDocRef);
          
          if (usageSnap.exists() && usageSnap.data().date === today) {
            const currentCount = usageSnap.data().count || 0;
            const currentTokens = usageSnap.data().tokensUsed || 0;
            const currentLimitTokens = usageSnap.data().limitTokens || limitTokens;
            await updateDoc(usageDocRef, {
              count: currentCount + 1,
              tokensUsed: currentTokens + tokensSpentThisRequest,
              lastTokenCost: tokensSpentThisRequest,
              limitTokens: currentLimitTokens,
              updatedAt: new Date().toISOString()
            });
            setTokensUsed(currentTokens + tokensSpentThisRequest);
            setLastTokenCost(tokensSpentThisRequest);
          } else {
            const initialLimit = usageSnap.exists() ? (usageSnap.data().limitTokens || 100000) : limitTokens;
            await setDoc(usageDocRef, {
              date: today,
              count: 1,
              tokensUsed: tokensSpentThisRequest,
              lastTokenCost: tokensSpentThisRequest,
              limitTokens: initialLimit,
              updatedAt: new Date().toISOString()
            });
            setTokensUsed(tokensSpentThisRequest);
            setLastTokenCost(tokensSpentThisRequest);
          }
        } catch (err) {
          console.error("Failed to update usage count", err);
        }
      }

      setIsOpen(false);
      setUrl('');
      toast.success('Project created successfully!');
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || 'An unexpected error occurred.';
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        errorMessage = "The Gemini API key is invalid. Please check and update your API key in the Settings > Secrets panel.";
      }
      setError(errorMessage);
      toast.error('Failed to extract and create project.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 p-2.5 sm:p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-[0_8px_30px_rgb(79,70,229,0.4)] text-white hover:scale-105 active:scale-95 transition-all z-40 group"
        title="Smart Project Creator"
      >
        <Bot className="w-5 h-5 sm:w-7 sm:h-7 group-hover:animate-bounce" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-800 text-white text-xs font-semibold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Smart Add from Sheet
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoading && setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10"
            >
              <button
                onClick={() => !isLoading && setIsOpen(false)}
                disabled={isLoading}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Smart Project Creator</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Paste a Google Sheet link to extract and auto-fill project info.</p>
                </div>
              </div>

              <div className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-900/50">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Google Sheet URL</label>
                    <div className="relative group/info">
                      <Info size={14} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 text-xs bg-slate-800 text-white p-2.5 rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all whitespace-normal z-10 pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-800">
                        The Google Sheet must be shared as "Anyone with the link can view".
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="url"
                      name="sheetUrl"
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Groq API Key</label>
                      <div className="relative group/info">
                        <Info size={14} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                        <div className="absolute bottom-full left-0 mb-2 w-64 text-xs bg-slate-800 text-white p-2.5 rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all whitespace-normal z-10 before:content-[''] before:absolute before:top-full before:left-4 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-800">
                          Required for extracting Google Sheets. Get a free API key from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Groq Console</a>. Your key is stored securely in your account.
                        </div>
                      </div>
                    </div>
                    {isFetchingUsage ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Checking limits...</span>
                    ) : tokensUsed !== null ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tokensUsed >= limitTokens ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                        Approx Remaining: {lastTokenCost > 0 ? Math.floor(Math.max(0, limitTokens - tokensUsed) / lastTokenCost) : '?'} projects
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="groqApiKey"
                      autoComplete="new-password"
                      spellCheck="false"
                      data-lpignore="true"
                      data-form-type="other"
                      value={customApiKey}
                      onChange={(e) => {
                         setCustomApiKey(e.target.value);
                         if (isSavedKey && e.target.value !== customApiKey) setIsSavedKey(false);
                         if (showConfirmRemove) setShowConfirmRemove(false);
                      }}
                      placeholder="gsk_..."
                      className="w-full pl-4 pr-[110px] py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                      disabled={isLoading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {isSavedKey ? (
                        <button
                          onClick={removeKeyFromFirebase}
                          type="button"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            showConfirmRemove 
                              ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30' 
                              : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60'
                          }`}
                          title={showConfirmRemove ? "Click to confirm removal" : "Remove saved key"}
                        >
                          {showConfirmRemove ? <><Check size={14} /> Sure?</> : <><Trash2 size={14} /> Remove</>}
                        </button>
                      ) : (
                        <button
                          onClick={saveKeyToFirebase}
                          type="button"
                          disabled={!customApiKey.trim()}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Save key to account"
                        >
                          <Save size={14} /> Save
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleExtract}
                    disabled={!url.trim() || isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Extracting & Creating...
                      </>
                    ) : (
                      <>Add Project Automatically</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
