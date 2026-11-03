import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { pb } from '../lib/pocketbase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(pb.authStore.record);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Keep React state synced with PocketBase's authStore (handles token refresh too)
    const unsubscribe = pb.authStore.onChange((token, record) => {
      setCurrentUser(record);
    }, true);

    // Validate the stored token on load; clears it if the staff account
    // was deactivated or the token expired
    (async () => {
      if (pb.authStore.isValid) {
        try {
          await pb.collection('staff').authRefresh();
        } catch (err) {
          pb.authStore.clear();
        }
      }
      setIsLoading(false);
    })();

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const authData = await pb.collection('staff').authWithPassword(email, password);
    if (!authData.record.active) {
      pb.authStore.clear();
      throw new Error('This account has been deactivated. Contact Arslan.');
    }
    return authData;
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const value = {
    currentUser,
    isAdmin,
    isAuthenticated: !!currentUser,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
