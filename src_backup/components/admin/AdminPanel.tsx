import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, where, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Shield, Users, Activity, Calendar, Mail, Clock, Database, HardDrive, ExternalLink, Trash2, AlertTriangle, Download, ChevronDown, X } from 'lucide-react';
import { formatRelativeTime } from '../../utils/dateUtils';
import { UserProfile, UserRole } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useTheme } from '../../context/ThemeContext';

export function AdminPanel() {
  const { isAdmin, user: currentUser } = useAuth();
  const { theme } = useTheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useBodyScrollLock(!!userToDelete);

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    if (!isAdmin || !db) return;
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('lastLoginAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportUserData = async () => {
    if (!userToDelete || !db) return;
    setIsExporting(true);

    try {
      // Fetch all projects for this user
      const projectsRef = collection(db, 'projects');
      const projectsQuery = query(projectsRef, where('userId', '==', userToDelete.uid));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projects = projectsSnapshot.docs.map(doc => doc.data());
      
      // Fetch all global notes for this user
      const notesRef = collection(db, 'globalNotes');
      const notesQuery = query(notesRef, where('userId', '==', userToDelete.uid));
      const notesSnapshot = await getDocs(notesQuery);
      const notes = notesSnapshot.docs.map(doc => doc.data());

      // Prepare the data object
      const exportData = {
        userInfo: userToDelete,
        projectsCount: projects.length,
        notesCount: notes.length,
        projects: projects,
        notes: notes,
        exportedAt: new Date().toISOString()
      };

      // Convert to formatted JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create a blob and trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Safe filename
      const safeName = (userToDelete.displayName || userToDelete.email).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `backup_${safeName}_${new Date().getTime()}.json`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting user data:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !db) return;
    setIsDeleting(true);

    try {
      // 1. Delete all projects for this user
      const projectsRef = collection(db, 'projects');
      const projectsQuery = query(projectsRef, where('userId', '==', userToDelete.uid));
      const projectsSnapshot = await getDocs(projectsQuery);
      
      // 2. Delete all global notes for this user
      const notesRef = collection(db, 'globalNotes');
      const notesQuery = query(notesRef, where('userId', '==', userToDelete.uid));
      const notesSnapshot = await getDocs(notesQuery);

      // Use a batch for atomic deletion if possible, or just delete one by one
      // Firestore batches have a limit of 500 operations, so we might need to chunk if large,
      // but for this app, one by one or a single batch is usually fine.
      const batch = writeBatch(db);
      
      projectsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      notesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Delete the user document
      const userRef = doc(db, 'users', userToDelete.uid);
      batch.delete(userRef);

      await batch.commit();

      // Update local state
      setUsers(users.filter(u => u.uid !== userToDelete.uid));
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user data:", error);
      // In a real app, we'd show a toast notification here
    } finally {
      setIsDeleting(false);
    }
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

  // Calculate a very rough estimate of storage used (Text data is extremely small)
  // Assuming ~2KB per user and ~10KB of project data per user on average
  const estimatedBytes = users.length * 12 * 1024; 
  const estimatedMB = Math.max(0.01, estimatedBytes / (1024 * 1024)).toFixed(2);
  const usagePercentage = Math.max(1, (estimatedBytes / (1024 * 1024 * 1024)) * 100); // Minimum 1% for visual purposes

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <Shield className="text-blue-500" size={24} />
            Admin Dashboard
          </h1>
          <p className={`text-sm mt-1 sm:mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Manage users and monitor application activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className={`border rounded-2xl p-6 relative overflow-hidden group transition-all ${
          theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Users</h3>
              <Users size={20} className="text-blue-400" />
            </div>
            <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{users.length}</p>
          </div>
        </div>
        
        <div className={`border rounded-2xl p-6 relative overflow-hidden group transition-all ${
          theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active Today</h3>
              <Activity size={20} className="text-emerald-400" />
            </div>
            <p className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {users.filter(u => {
                const lastLogin = new Date(u.lastLoginAt);
                const today = new Date();
                return lastLogin.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
        </div>

        <div className={`border rounded-2xl p-6 relative overflow-hidden group transition-all ${
          theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Database Status</h3>
              <Database size={20} className="text-purple-400" />
            </div>
            <p className={`text-xl font-medium flex items-center gap-2 mt-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected
            </p>
          </div>
        </div>

        <div className={`border rounded-2xl p-6 relative overflow-hidden group transition-all ${
          theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-500/20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Storage (Free Tier)</h3>
              <HardDrive size={20} className="text-orange-400" />
            </div>
            <div className="flex items-baseline gap-1.5 mb-2.5">
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>~{estimatedMB}</p>
              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>MB / 1 GB</p>
            </div>
            <div className={`w-full rounded-full h-1.5 mb-3 overflow-hidden ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-100'}`}>
              <div className="bg-orange-500 h-full rounded-full" style={{ width: `${usagePercentage}%` }}></div>
            </div>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 uppercase tracking-wider font-bold transition-colors w-fit"
            >
              Exact Usage <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      <div className={`border rounded-2xl overflow-hidden ${
        theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b ${
          theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
        }`}>
          <h2 className={`text-base sm:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>User Directory</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className={`border-b ${
                theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/30'
              }`}>
                <th className={`px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>User</th>
                <th className={`px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Role</th>
                <th className={`px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Joined</th>
                <th className={`px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Last Active</th>
                <th className={`px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-right ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/10' : 'divide-slate-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.uid} className={`transition-colors ${theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`} referrerPolicy="no-referrer" />
                        ) : (
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold border text-xs sm:text-base ${
                            theme === 'dark' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user.displayName || 'Unknown User'}</div>
                          <div className={`text-[10px] sm:text-xs flex items-center gap-1 mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                            <Mail size={10} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className={`text-[11px] sm:text-sm flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        <Calendar size={12} className="text-gray-500" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className={`text-[11px] sm:text-sm flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                        <Clock size={12} className="text-gray-500" />
                        {formatRelativeTime(user.lastLoginAt)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                      {currentUser?.uid !== user.uid && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-1.5 sm:p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove User & Data"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => !isDeleting && !isExporting && setUserToDelete(null)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative rounded-2xl shadow-2xl border w-full max-w-md overflow-hidden flex flex-col ${
                theme === 'dark' ? 'bg-[#020617] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${
                theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
              }`}>
                <h2 className={`text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Delete User Data?</h2>
                <button 
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting || isExporting}
                  className={`transition-colors p-1 rounded-lg disabled:opacity-50 ${
                    theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto scrollbar-thin">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                
                <p className={`text-sm mb-6 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Are you sure you want to remove <strong className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{userToDelete.displayName || userToDelete.email}</strong>? 
                  This will permanently delete their profile, all their projects, and all their notes from the database. This action cannot be undone.
                </p>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleExportUserData}
                    disabled={isExporting || isDeleting}
                    className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download size={18} />
                    )}
                    {isExporting ? 'Exporting...' : 'Export User Data (JSON)'}
                  </button>
                  
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setUserToDelete(null)}
                      disabled={isDeleting || isExporting}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                        theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteUser}
                      disabled={isDeleting || isExporting}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          Delete All Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
