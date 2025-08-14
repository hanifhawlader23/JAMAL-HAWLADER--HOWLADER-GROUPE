

import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { User, Role } from '../types';
import { useToast } from '../hooks/useToast';
import { AppLoadingScreen } from '../components/AppLoadingScreen';
import { findUserByEmail, createUser, validateCredentials } from '../lib/simpleAuth';

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
    // Check localStorage for saved user session
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Failed to restore user session:", error);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message: string; }> => {
    try {
      const user = validateCredentials(username, password);
      if (user) {
        const authUser = {
          id: user.id,
          username: user.email,
          role: user.role as Role,
          fullName: user.name
        };
        setCurrentUser(authUser);
        localStorage.setItem('currentUser', JSON.stringify(authUser));
        return { success: true, message: 'Login successful!' };
      } else {
        return { success: false, message: 'Invalid email or password.' };
      }
    } catch (error) {
      return { success: false, message: 'An error occurred during login.' };
    }
  };
  
  const logout = useCallback(async () => {
    localStorage.removeItem('currentUser');
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
  }, []);

  const signup = async (fullName: string, username: string, password: string): Promise<{ success: boolean; message: string; }> => {
    try {
      // Check if user already exists
      if (findUserByEmail(username)) {
        return { success: false, message: 'An account with this email already exists.' };
      }
      
      const user = createUser(username, password, fullName);
      const authUser = {
        id: user.id,
        username: user.email,
        role: user.role as Role,
        fullName: user.name
      };
      setCurrentUser(authUser);
      localStorage.setItem('currentUser', JSON.stringify(authUser));
      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
        return { success: false, message: 'Could not create account. Please check your connection and try again.' };
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