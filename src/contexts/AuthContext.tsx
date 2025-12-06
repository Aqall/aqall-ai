import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TODO: Connect to Supabase Auth in production
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('aqall-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    // TODO: Connect real Supabase auth
    // Mock login - accept any valid email format
    if (!email.includes('@')) {
      return { error: 'Invalid email format' };
    }
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }

    const mockUser: User = {
      id: 'user-' + Date.now(),
      email,
      name: email.split('@')[0],
    };

    setUser(mockUser);
    localStorage.setItem('aqall-user', JSON.stringify(mockUser));
    return {};
  };

  const signup = async (email: string, password: string): Promise<{ error?: string }> => {
    // TODO: Connect real Supabase auth
    return login(email, password);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aqall-user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
