import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  // Returns { mfaRequired: true } when the account has MFA enrolled and the
  // caller must follow up with completeMfa(). Otherwise returns void once
  // the user is fully signed in.
  login: (username: string, password: string) => Promise<{ mfaRequired?: boolean } | void>;
  completeMfa: (args: { code?: string; recoveryCode?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the user is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      const data = await response.json();
      if (data?.mfaRequired) {
        return { mfaRequired: true as const };
      }
      setUser(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error during login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeMfa = async (args: { code?: string; recoveryCode?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('POST', '/api/auth/mfa/challenge', args);
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error during MFA');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      await apiRequest('POST', '/api/auth/logout');
      setUser(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error during logout');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    completeMfa,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
