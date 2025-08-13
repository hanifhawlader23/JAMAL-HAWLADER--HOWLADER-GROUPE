
import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User, Role } from '../types';
import { useToast } from '../hooks/useToast';
import { AppLoadingScreen } from '../components/AppLoadingScreen';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string; }>;
  logout: () => Promise<void>;
  loginWithBiometrics: () => Promise<{ success: boolean; message: string; }>;
  registerBiometrics: () => Promise<{success: boolean, message: string}>;
  signup: (fullName: string, username: string, password: string) => Promise<{ success: boolean; message: string; }>;
  signupWithBiometrics: () => Promise<{ success: boolean; message: string; }>;
  isAuthenticated: boolean;
  authLoading: boolean;
  hasRole: (roles: Role[]) => boolean;
  viewAsRole: Role | null;
  setViewAsRole: React.Dispatch<React.SetStateAction<Role | null>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Start loading on mount
  const [viewAsRole, setViewAsRole] = useState<Role | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Failed to verify user session:", error);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    verifyUser();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message: string; }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        return { success: true, message: 'Login successful!' };
      } else {
        return { success: false, message: data.message || 'Login failed.' };
      }
    } catch (error) {
      return { success: false, message: 'An error occurred during login.' };
    }
  };
  
  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    setViewAsRole(null);
  }, []);

  const signup = async (fullName: string, username: string, password: string): Promise<{ success: boolean; message: string; }> => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        return { success: true, message: 'Signup successful!' };
      } else {
        return { success: false, message: data.message || 'Signup failed.' };
      }
    } catch (error) {
        return { success: false, message: 'Failed to create account.' };
    }
  };

  const hasRole = useCallback((roles: Role[]): boolean => {
    if (!currentUser) return false;
    const effectiveRole = viewAsRole || currentUser.role;
    return roles.includes(effectiveRole);
  }, [currentUser, viewAsRole]);

  const isAuthenticated = !!currentUser;
  
  // --- Biometrics (placeholder) ---
  const signupWithBiometrics = async (): Promise<{ success: boolean, message: string }> => {
    addToast("Biometric features are under development for the new system.", 'info');
    return { success: false, message: "Biometric signup is not available." };
  };
  const registerBiometrics = async (): Promise<{success: boolean, message: string}> => {
    addToast("Biometric features are under development for the new system.", 'info');
    return { success: false, message: "Biometric registration is not available." };
  };
  const loginWithBiometrics = async (): Promise<{ success: boolean; message: string; }> => {
    addToast("Biometric features are under development for the new system.", 'info');
    return { success: false, message: "Biometric login is not available." };
  };
  
  const value: AuthContextType = { currentUser, login, logout, loginWithBiometrics, registerBiometrics, signup, signupWithBiometrics, isAuthenticated, authLoading, hasRole, viewAsRole, setViewAsRole, setCurrentUser };

  if (authLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
