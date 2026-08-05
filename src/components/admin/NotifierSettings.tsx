import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Bell, Key, MessageSquare, Save, Settings, Shield, Plus, Trash2, CheckCircle2, Users, Search, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export function NotifierSettings() {
  const { theme } = useTheme();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [recentChats, setRecentChats] = useState<{ id: string, title: string, type: string }[]>([]);
  const [fetchingChats, setFetchingChats] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const defaultTemplate = `🚀 <b>Project Updated</b>\n\n<b>Title:</b> {{title}}\n<b>Client:</b> {{clientName}}\n<b>Stage:</b> {{stage}}\n<b>Priority:</b> {{priority}}`;

  const [settings, setSettings] = useState({
    enabled: true,
    globalBotToken: '8983135896:AAFPPlz1ohjYvFbPSkbtDA81Qb-Zk451cFs',
    globalChatId: '',
    projectChats: [] as { id: string, name: string, chatId: string }[],
    messageTemplate: defaultTemplate
  });

  useEffect(() => {
    setVerificationCode(Math.floor(1000 + Math.random() * 9000).toString());
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [isAdmin]);

  const fetchSettings = async () => {
    if (!isAdmin || !db) return;
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
          messageTemplate: data.messageTemplate || defaultTemplate
        });
      }
    } catch (error) {
      console.error('Error fetching notifier settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (settingsToSave = settings) => {
    if (!isAdmin || !db) return;
    setSaving(true);
    setSuccess('');
    try {
      await setDoc(doc(db, 'settings', 'notifier'), settingsToSave, { merge: true });
      setSuccess('Notifier settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving notifier settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const fetchRecentChats = async () => {
    setFetchingChats(true);
    setFetchError('');
    setRecentChats([]);

    // Small delay to provide visual feedback that the button was clicked
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const startTime = Date.now();
      const response = await fetch(`https://api.telegram.org/bot${settings.globalBotToken.trim()}/getUpdates`);
      const data = await response.json();
      
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        // Add a small delay so the user can see the button actually did something
        await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
      }
      
      console.log('Telegram API GetUpdates Response:', data);

      if (!data.ok) {
        if (data.description === 'Conflict: can\'t use getUpdates method while webhook is active; use deleteWebhook to delete the webhook first') {
             throw new Error('Your bot has a Webhook active. Please remove the webhook to use this finder, or refer to Telegram documentation.');
        }
        throw new Error(`Telegram error: ${data.description || 'Failed to fetch updates'}`);
      }

      if (!data.result || data.result.length === 0) {
        setFetchError('No recent messages found. Please go back to your Telegram group, mention the bot directly (e.g. "@your_bot_username hello") or send "/id", and try scanning again. (Note: Bots cannot see messages in groups by default unless mentioned or starting with /).');
        setFetchingChats(false);
        return;
      }

      const chats = new Map<string, { id: string, title: string, type: string }>();
      
      data.result.forEach((update: any) => {
        let chat = null;
        let text = '';
        
        if (update.message?.chat) {
          chat = update.message.chat;
          text = update.message.text || '';
        } else if (update.edited_message?.chat) {
          chat = update.edited_message.chat;
          text = update.edited_message.text || '';
        } else if (update.channel_post?.chat) {
          chat = update.channel_post.chat;
          text = update.channel_post.text || '';
        } else if (update.edited_channel_post?.chat) {
          chat = update.edited_channel_post.chat;
          text = update.edited_channel_post.text || '';
        }
        
        if (chat && text.includes(verificationCode)) {
          chats.set(chat.id.toString(), {
            id: chat.id.toString(),
            title: chat.title || chat.username || chat.first_name || 'Unknown',
            type: chat.type
          });
        }
      });
      
      const chatList = Array.from(chats.values());
      if (chatList.length === 0) {
        setFetchError(`Could not find the verification code (${verificationCode}) in any recent messages. Make sure you sent "/id ${verificationCode}" in your target group.`);
      } else {
        setRecentChats(chatList);
      }
    } catch (error: any) {
      console.error('Error fetching recent chats:', error);
      setFetchError(error.message || 'Failed to connect to Telegram API. Check your internet connection or bot token.');
    } finally {
      setFetchingChats(false);
    }
  };

  const addProjectChat = () => {
    setSettings(prev => ({
      ...prev,
      projectChats: [...prev.projectChats, { id: Date.now().toString(), name: '', chatId: '' }]
    }));
  };

  const updateProjectChat = (id: string, field: 'name' | 'chatId', value: string) => {
    setSettings(prev => ({
      ...prev,
      projectChats: prev.projectChats.map(chat => 
        chat.id === id ? { ...chat, [field]: value } : chat
      )
    }));
  };

  const removeProjectChat = (id: string) => {
    setSettings(prev => ({
      ...prev,
      projectChats: prev.projectChats.filter(chat => chat.id !== id)
    }));
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield size={48} className="text-red-500 mb-4 opacity-50" />
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Access Denied</h2>
        <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <Bell className="text-blue-500" size={24} />
            Notifier Settings
          </h1>
          <p className={`text-sm mt-1 sm:mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Configure your Telegram bot to receive project updates instantly.
          </p>
        </div>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-all font-semibold shadow-lg shadow-blue-500/20"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-3"
        >
          <CheckCircle2 size={20} />
          <p className="font-medium">{success}</p>
        </motion.div>
      )}

      {/* Global Settings */}
      <div className={`border rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-100'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Settings size={20} />
            </div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Global Configuration</h2>
          </div>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Enable Notifications</span>
            <div className="relative">
              <input 
                type="checkbox"
                className="sr-only"
                checked={settings.enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${settings.enabled ? 'bg-blue-500' : theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.enabled ? 'transform translate-x-6' : ''}`}></div>
            </div>
          </label>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Main Update Chat ID
              </label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...settings, globalChatId: '' };
                    setSettings(updated);
                    handleSave(updated); 
                  }}
                  className="text-xs px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-md transition-colors"
                >
                  Save ID
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MessageSquare size={16} className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />
              </div>
              <input
                type="text"
                value={settings.globalChatId}
                onChange={(e) => setSettings(prev => ({ ...prev, globalChatId: e.target.value }))}
                placeholder="e.g. -100123456789"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
              />
            </div>
            <p className={`mt-1.5 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              The default team group ID where all updates will be sent.
            </p>
          </div>
        </div>
      </div>

      {/* Project Overrides */}
      <div className={`border rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-100'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Users size={20} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Targeted Chat Groups</h2>
              <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Add specific group IDs for individual projects</p>
            </div>
          </div>
          <button
            onClick={addProjectChat}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded-xl transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Add Group
          </button>
        </div>

        <div className="p-6">
          {settings.projectChats.length === 0 ? (
            <div className={`text-center py-8 border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
              <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
              <p>No project-specific groups added yet.</p>
              <button 
                onClick={addProjectChat}
                className="mt-3 text-purple-500 font-medium hover:underline text-sm"
              >
                Add your first specific group
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.projectChats.map((chat) => (
                <div key={chat.id} className={`flex flex-col sm:flex-row gap-4 p-4 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex-1">
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Identifier / Tag name</label>
                    <input
                      type="text"
                      value={chat.name}
                      onChange={(e) => updateProjectChat(chat.id, 'name', e.target.value)}
                      placeholder="e.g. Acme Web App"
                      className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                        theme === 'dark' 
                          ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-purple-500' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Chat ID</label>
                    <div className="flex gap-2">
                       <input
                        type="text"
                        value={chat.chatId}
                        onChange={(e) => updateProjectChat(chat.id, 'chatId', e.target.value)}
                        placeholder="e.g. -100987654321"
                        className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                          theme === 'dark' 
                            ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-purple-500' 
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                        }`}
                      />
                      <button
                        onClick={() => removeProjectChat(chat.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Template Customization */}
      <div className={`border rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-100'} flex items-center gap-3`}>
          <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Message Template Visual Builder</h2>
            <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Configure labels and defaults. Sent values can be customized per-update.</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Header Message format
              </label>
              <input
                type="text"
                value={settings.templateConfig?.header ?? '🚀 <b>Project Updated</b>'}
                onChange={(e) => setSettings(prev => ({ ...prev, templateConfig: { ...(prev.templateConfig || {}), header: e.target.value } }))}
                placeholder="e.g. 🚀 <b>Project Updated</b>"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                }`}
              />
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Title (Optional Default)
              </label>
              <input
                type="text"
                value={settings.templateConfig?.defaultTitle ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, templateConfig: { ...(prev.templateConfig || {}), defaultTitle: e.target.value } }))}
                placeholder="Leave blank to use project title"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Client (Optional Default)
              </label>
              <input
                type="text"
                value={settings.templateConfig?.defaultClient ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, templateConfig: { ...(prev.templateConfig || {}), defaultClient: e.target.value } }))}
                placeholder="Leave blank to use project client"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Stage (Optional Default)
              </label>
              <input
                type="text"
                value={settings.templateConfig?.defaultStage ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, templateConfig: { ...(prev.templateConfig || {}), defaultStage: e.target.value } }))}
                placeholder="e.g. In Progress, Final, etc."
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Priority (Optional Default)
              </label>
              <input
                type="text"
                value={settings.templateConfig?.defaultPriority ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, templateConfig: { ...(prev.templateConfig || {}), defaultPriority: e.target.value } }))}
                placeholder="e.g. High, Medium, Low"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/10 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={`block text-xs font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Default Footer Notes (Optional)
              </label>
              <textarea
                value={settings.templateConfig?.footerText ?? ''}
                onChange={(e) => setSettings(prev => ({ ...prev, templateConfig: { ...(prev.templateConfig || {}), footerText: e.target.value } }))}
                rows={2}
                placeholder="e.g. Please check your dashboard for further details."
                className={`w-full p-3 rounded-xl border focus:outline-none transition-all resize-y text-sm ${
                  theme === 'dark' 
                    ? 'bg-black/20 border-white/10 text-white focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              />
              <p className="pt-2 text-xs text-slate-500 italic">Leaves blank if you don't want a default footer. You can override it per-update.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Group ID Finder */}
      <div className={`border rounded-2xl flex-shrink overflow-hidden ${theme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`px-6 py-5 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-100'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <Search size={20} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Telegram Group ID Finder</h2>
              <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Easily find IDs of groups where your bot is added</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchRecentChats}
            disabled={fetchingChats}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm disabled:opacity-50 ${
              theme === 'dark' 
                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
            }`}
          >
            <RefreshCw size={16} className={fetchingChats ? "animate-spin" : ""} />
            {fetchingChats ? 'Verifying...' : 'Verify & Get ID'}
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-xl">
            <p className="text-sm text-slate-400 mb-2">Your Verification Code</p>
            <div className="text-4xl font-mono tracking-widest font-bold">{verificationCode}</div>
          </div>
          
          <div className={`p-4 rounded-xl mb-4 text-sm ${theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
            <p className="font-semibold mb-1">How to securely find your Group ID:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1 opacity-90">
              <li>Add your Telegram bot to the target group.</li>
              <li>Send this exact message in the group: <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-blue-500 font-mono">/id {verificationCode}</code></li>
              <li>Click the "Verify & Get ID" button above.</li>
              <li>Only the group where this code was sent will be displayed below.</li>
            </ol>
          </div>

          {fetchError && (
            <div className="p-3 mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">
              {fetchError}
            </div>
          )}

          {recentChats.length > 0 && (
            <div className="space-y-3">
              <h3 className={`text-sm font-medium pl-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Found {recentChats.length} recent chats:
              </h3>
              <div className="space-y-2">
                {recentChats.map(chat => (
                  <div key={chat.id} className={`flex items-center justify-between p-3 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                    <div>
                      <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{chat.title}</p>
                      <p className={`text-xs capitalize ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{chat.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className={`px-2 py-1 rounded text-xs ${theme === 'dark' ? 'bg-black/30 text-blue-400' : 'bg-slate-200 text-blue-600'}`}>
                        {chat.id}
                      </code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(chat.id);
                          setSuccess(`Copied ID for ${chat.title}`);
                          setTimeout(() => setSuccess(''), 3000);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
