import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, deleteDoc, where, or } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Team, UserProfile } from '../../types';
import { Users, Plus, Edit2, Trash2, Shield, LayoutDashboard, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { ChatDrawer } from './ChatDrawer';

interface TeamManagementProps {
  onNavigate?: (view: 'dashboard' | 'team-dashboard' | 'admin' | 'teams', teamId?: string, chat?: boolean) => void;
  initialTeamId?: string;
  chatOpenTrigger?: number;
}

export function TeamManagement({ onNavigate, initialTeamId, chatOpenTrigger }: TeamManagementProps) {
  const { userProfile, isAdmin } = useAuth();
  const { theme } = useTheme();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  useBodyScrollLock(isModalOpen);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatTeam, setSelectedChatTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (chatOpenTrigger && chatOpenTrigger > 0 && initialTeamId && teams.length > 0) {
      const team = teams.find(t => t.id === initialTeamId);
      if (team) {
        setSelectedChatTeam(team);
        setIsChatOpen(true);
      }
    }
  }, [chatOpenTrigger, initialTeamId, teams]);

  // Form state
  const [name, setName] = useState('');
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [leaderId, setLeaderId] = useState('');
  const [coLeaderId, setCoLeaderId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    if (!db || !userProfile) return;
    try {
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);

      // Fetch teams where user is a member, or all teams if admin
      let teamsQuery;
      if (isAdmin) {
        teamsQuery = query(collection(db, 'teams'));
      } else {
        teamsQuery = query(
          collection(db, 'teams'), 
          or(
            where('allMembers', 'array-contains', userProfile.uid),
            where('managerIds', 'array-contains', userProfile.uid),
            where('leaderId', '==', userProfile.uid),
            where('coLeaderId', '==', userProfile.uid),
            where('memberIds', 'array-contains', userProfile.uid)
          )
        );
      }
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Team, 'id'>) } as Team));
      setTeams(teamsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !userProfile) return;

    try {
      const allMembers = Array.from(new Set([
        ...managerIds, 
        leaderId, 
        coLeaderId, 
        ...memberIds
      ].filter(Boolean)));
      
      const teamData = {
        name,
        managerIds,
        leaderId,
        coLeaderId: coLeaderId || null,
        memberIds,
        allMembers,
        updatedAt: new Date().toISOString()
      };

      console.log("Saving team data:", teamData);

      if (editingTeam) {
        await updateDoc(doc(db, 'teams', editingTeam.id), teamData);
      } else {
        await addDoc(collection(db, 'teams'), {
          ...teamData,
          createdBy: userProfile.uid,
          createdAt: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving team:", error);
      alert("Failed to save team.");
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!db || !window.confirm("Are you sure you want to delete this team?")) return;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      fetchData();
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("Failed to delete team.");
    }
  };

  const resetForm = () => {
    setName('');
    setManagerIds(userProfile ? [userProfile.uid] : []);
    setLeaderId('');
    setCoLeaderId('');
    setMemberIds([]);
    setEditingTeam(null);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setManagerIds(team.managerIds || []);
    setLeaderId(team.leaderId);
    setCoLeaderId(team.coLeaderId || '');
    setMemberIds(team.memberIds);
    setIsModalOpen(true);
  };

  const getUserName = (uid: string) => {
    const user = users.find(u => u.uid === uid);
    return user ? user.displayName || user.email : 'Unknown User';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            <Users className="text-blue-500" size={24} />
            Teams
          </h1>
          <p className={`text-sm mt-1 sm:mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Create and manage your teams, assign roles and members.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Create Team
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {teams.map(team => {
            const canEditTeam = isAdmin || (team.managerIds && team.managerIds.includes(userProfile?.uid || '')) || team.createdBy === userProfile?.uid;
            const canViewDashboard = isAdmin || (team.managerIds && team.managerIds.includes(userProfile?.uid || '')) || team.leaderId === userProfile?.uid || team.coLeaderId === userProfile?.uid;
            const canViewChat = isAdmin || canViewDashboard || (team.memberIds && team.memberIds.includes(userProfile?.uid || ''));
            
            return (
              <div key={team.id} className={`border rounded-2xl p-6 transition-all flex flex-col h-full ${
                theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{team.name}</h3>
                  {canEditTeam && (
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(team)} className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(team.id)} className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      }`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 flex-1">
                  {team.managerIds && team.managerIds.length > 0 && (
                    <div>
                      <span className={`text-xs uppercase font-semibold tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Managers</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {team.managerIds.map(id => (
                          <span key={id} className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                            {getUserName(id)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className={`text-xs uppercase font-semibold tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Leader</span>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getUserName(team.leaderId)}</p>
                  </div>
                  {team.coLeaderId && (
                    <div>
                      <span className={`text-xs uppercase font-semibold tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Co-Leader</span>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getUserName(team.coLeaderId)}</p>
                    </div>
                  )}
                  <div>
                    <span className={`text-xs uppercase font-semibold tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-slate-500'}`}>Members ({team.memberIds.length})</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {team.memberIds.map(id => (
                        <span key={id} className={`text-xs px-2 py-1 rounded-md border ${theme === 'dark' ? 'bg-white/10 text-gray-300 border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {getUserName(id)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {(canViewDashboard || canViewChat) && (
                  <div className={`mt-6 pt-4 border-t grid ${canViewDashboard && canViewChat ? 'grid-cols-2' : 'grid-cols-1'} gap-3 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                    {canViewDashboard && (
                      <button
                        onClick={() => onNavigate?.('team-dashboard', team.id)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm border ${
                          theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white border-transparent' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </button>
                    )}
                    {canViewChat && (
                      <button
                        onClick={() => { setSelectedChatTeam(team); setIsChatOpen(true); }}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm border ${
                          theme === 'dark' ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                        }`}
                      >
                        <MessageSquare size={16} />
                        Chat
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {teams.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No teams found. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative rounded-2xl shadow-2xl border w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                theme === 'dark' ? 'bg-[#020617] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`p-4 sm:p-6 border-b flex justify-between items-center shrink-0 ${
                theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
              }`}>
                <h2 className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {editingTeam ? <Edit2 size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                  {editingTeam ? 'Edit Team' : 'Create New Team'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className={`transition-colors p-1 rounded-lg ${
                    theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 scrollbar-thin">
                <div>
                  <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>Team Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g., Frontend Developers"
                  />
                </div>

                <div>
                  <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>Managers</label>
                  <div className={`border rounded-xl p-3 sm:p-4 max-h-32 sm:max-h-40 overflow-y-auto space-y-1.5 sm:space-y-2 scrollbar-thin ${
                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {users.map(user => (
                      <label key={user.uid} className={`flex items-center gap-3 p-1.5 sm:p-2 rounded-lg cursor-pointer transition-colors ${
                        theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-white'
                      }`}>
                        <input
                          type="checkbox"
                          checked={managerIds.includes(user.uid)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setManagerIds([...managerIds, user.uid]);
                            } else {
                              setManagerIds(managerIds.filter(id => id !== user.uid));
                            }
                          }}
                          className={`w-4 h-4 rounded text-blue-500 focus:ring-blue-500 ${
                            theme === 'dark' ? 'border-gray-600 focus:ring-offset-gray-900 bg-gray-700' : 'border-slate-300 focus:ring-offset-white bg-white'
                          }`}
                        />
                        <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{user.displayName || user.email}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>Leader</label>
                    <select
                      required
                      value={leaderId}
                      onChange={(e) => setLeaderId(e.target.value)}
                      className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none ${
                        theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>Select Leader</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid} className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>{u.displayName || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>Co-Leader (Optional)</label>
                    <select
                      value={coLeaderId}
                      onChange={(e) => setCoLeaderId(e.target.value)}
                      className={`w-full border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none ${
                        theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="" className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>Select Co-Leader</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid} className={theme === 'dark' ? 'bg-gray-900' : 'bg-white'}>{u.displayName || u.email}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>Members</label>
                  <div className={`border rounded-xl p-3 sm:p-4 max-h-48 sm:max-h-60 overflow-y-auto space-y-1.5 sm:space-y-2 scrollbar-thin ${
                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {users.map(user => (
                      <label key={user.uid} className={`flex items-center gap-3 p-1.5 sm:p-2 rounded-lg cursor-pointer transition-colors ${
                        theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-white'
                      }`}>
                        <input
                          type="checkbox"
                          checked={memberIds.includes(user.uid)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMemberIds([...memberIds, user.uid]);
                            } else {
                              setMemberIds(memberIds.filter(id => id !== user.uid));
                            }
                          }}
                          className={`w-4 h-4 rounded text-blue-500 focus:ring-blue-500 ${
                            theme === 'dark' ? 'border-gray-600 focus:ring-offset-gray-900 bg-gray-700' : 'border-slate-300 focus:ring-offset-white bg-white'
                          }`}
                        />
                        <div className="flex items-center gap-2">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" />
                          ) : (
                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                              theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>{user.displayName || user.email}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={`flex justify-end gap-3 pt-4 border-t shrink-0 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-medium transition-colors text-sm border ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white border-transparent' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm"
                  >
                    {editingTeam ? 'Save Changes' : 'Create Team'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedChatTeam && (
        <ChatDrawer 
          isOpen={isChatOpen}
          onClose={() => { setIsChatOpen(false); setSelectedChatTeam(null); }}
          teamId={selectedChatTeam.id}
          teamName={selectedChatTeam.name}
        />
      )}
    </div>
  );
}
