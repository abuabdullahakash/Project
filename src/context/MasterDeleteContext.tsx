import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface MasterDeleteContextType {
  requireMasterDelete: (action: () => Promise<void> | void) => void;
}

const MasterDeleteContext = createContext<MasterDeleteContextType | undefined>(undefined);

export function MasterDeleteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => Promise<void> | void) | null>(null);

  const requireMasterDelete = (action: () => Promise<void> | void) => {
    setPendingAction(() => action);
    setIsOpen(true);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleConfirm = async () => {
    if ((email.trim() === 'fyt0000012@gmail.com' || email.trim() === 'fyt0000012@gmail') && password === '@12a"AK"') {
      setIsOpen(false);
      if (pendingAction) {
        await pendingAction();
      }
      setPendingAction(null);
    } else {
      setError('Invalid master credentials');
    }
  };

  return (
    <MasterDeleteContext.Provider value={{ requireMasterDelete }}>
      {children}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-xl font-bold">Master Delete Authorization</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This action requires master credentials to proceed. Please enter the master email and password.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Master Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-900 dark:text-white"
                  placeholder="fyt0000012@..."
                  autoComplete="off"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  autoComplete="off"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 font-medium">
                  {error}
                </p>
              )}
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </MasterDeleteContext.Provider>
  );
}

export const useMasterDelete = () => {
  const context = useContext(MasterDeleteContext);
  if (!context) throw new Error('useMasterDelete must be used within MasterDeleteProvider');
  return context;
};
