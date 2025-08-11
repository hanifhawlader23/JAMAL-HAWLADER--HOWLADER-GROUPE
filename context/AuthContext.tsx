
import React, { createContext, useState, ReactNode, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useData } from '../hooks/useData';
import { User, Role } from '../types';
import { useToast } from '../hooks/useToast';

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  loginWithBiometrics: () => Promise<boolean>;
  registerBiometrics: () => Promise<{success: boolean, message: string}>;
  signup: (fullName: string, username: string, password: string) => { success: boolean; message: string; };
  signupWithBiometrics: () => Promise<{ success: boolean; message: string; }>;
  isAuthenticated: boolean;
  hasRole: (roles: Role[]) => boolean;
  viewAsRole: Role | null;
  setViewAsRole: React.Dispatch<React.SetStateAction<Role | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { users, addUser } = useData();
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
  const [viewAsRole, setViewAsRole] = useLocalStorage<Role | null>('viewAsRole', null);
  const toast = useToast();

  const login = useCallback((username: string, password: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      // Omit password before storing in state/localStorage
      const { password: _, ...userToStore } = user;
      setCurrentUser(userToStore);
      if(user.role !== Role.ADMIN) {
        setViewAsRole(null); // Reset view role if logging in as non-admin
      }
      return true;
    }
    return false;
  }, [users, setCurrentUser, setViewAsRole]);
  
  const logout = useCallback(() => {
    setCurrentUser(null);
    setViewAsRole(null); // Clear view role on logout
  }, [setCurrentUser, setViewAsRole]);

  const signup = (fullName: string, username: string, password: string): { success: boolean, message: string } => {
    const userExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (userExists) {
        return { success: false, message: 'A user with this email already exists.' };
    }
    const newUser: Omit<User, 'id'> = {
        fullName,
        username,
        password,
        role: Role.USER, // Default role
    };
    addUser(newUser);
    
    // Automatically log in the new user
    login(username, password);
    
    return { success: true, message: 'Signup successful!' };
  };

  const signupWithBiometrics = async (): Promise<{ success: boolean, message: string }> => {
    toast.addToast("Biometric signup is not yet supported. Please use email/password.", 'warning');
    return { success: false, message: "Biometric signup is not fully supported in this flow." };
  };

  const registerBiometrics = async (): Promise<{success: boolean, message: string}> => {
    if (!currentUser) return { success: false, message: "You must be logged in to register." };

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credentialCreationOptions: CredentialCreationOptions = {
            publicKey: {
                challenge,
                rp: { name: "Textile Management System" },
                user: {
                    id: Uint8Array.from(currentUser.id, c => c.charCodeAt(0)),
                    name: currentUser.username,
                    displayName: currentUser.fullName,
                },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                    residentKey: 'required',
                },
                timeout: 60000,
            },
        };
    
        const credential = await navigator.credentials.create(credentialCreationOptions);
        
        if (credential) {
            const newCredential = credential as PublicKeyCredential;
            // Store the credential ID in a way that can be retrieved later.
            // Base64 encoding is a standard way to store binary data as a string.
            const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(newCredential.rawId)));
            
            // Store a mapping from user to credential and vice-versa for easy lookup.
            localStorage.setItem(`biometric_credential_id_for_${currentUser.id}`, credentialId);
            localStorage.setItem(`user_for_biometric_${credentialId}`, currentUser.id); 
            
            toast.addToast("Biometric registration successful!", 'success');
            return { success: true, message: "Biometric registration successful!" };
        }
        
        return { success: false, message: "Registration was cancelled." };
    } catch (err: any) {
        console.error("Biometric registration error:", err);
        toast.addToast(`Biometric registration failed: ${err.message}`, 'error');
        return { success: false, message: `Biometric registration failed: ${err.message}` };
    }
  };


  const loginWithBiometrics = async (): Promise<boolean> => {
      try {
          const hasRegisteredKeys = Object.keys(localStorage).some(k => k.startsWith('biometric_credential_id_for_'));
          if (!hasRegisteredKeys) {
              toast.addToast("No biometric credentials registered on this device.", 'warning');
              return false;
          }

          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          // We don't provide allowCredentials here to allow the browser/OS to show all available
          // passkeys, which is a better user experience.
          const credentialRequestOptions: CredentialRequestOptions = {
              publicKey: {
                  challenge,
                  timeout: 60000,
                  userVerification: 'required',
              },
          };

          const assertion = await navigator.credentials.get(credentialRequestOptions);

          if (assertion) {
              const receivedCredential = assertion as PublicKeyCredential;
              const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(receivedCredential.rawId)));
              
              const userId = localStorage.getItem(`user_for_biometric_${credentialId}`);
              
              if (userId) {
                  const userToLogin = users.find(u => u.id === userId);
                  if (userToLogin) {
                      // We still use the password-based login as the final step
                      // since our app's session management is tied to it.
                      return login(userToLogin.username, userToLogin.password || '');
                  }
              }
          }
          toast.addToast("Biometric verification failed. Could not find a matching user.", 'error');
          return false;
      } catch (err: any) {
          console.error('Biometric login error:', err);
          // Don't alert for user cancellations (e.g. "The operation was aborted")
          if (err.name !== 'NotAllowedError') {
             toast.addToast(`Biometric login failed: ${err.message}`, 'error');
          }
          return false;
      }
  };

  const hasRole = useCallback((roles: Role[]): boolean => {
    if (!currentUser) return false;
    // If viewAsRole is set, use it for permission checks. Otherwise, use the user's actual role.
    const effectiveRole = viewAsRole || currentUser.role;
    return roles.includes(effectiveRole);
  }, [currentUser, viewAsRole]);

  const isAuthenticated = !!currentUser;

  const value: AuthContextType = { currentUser, login, logout, loginWithBiometrics, registerBiometrics, signup, signupWithBiometrics, isAuthenticated, hasRole, viewAsRole, setViewAsRole };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};