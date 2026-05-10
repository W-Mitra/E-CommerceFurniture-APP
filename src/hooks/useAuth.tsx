import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id, session.user.email);
      else setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchRole(currentUser.id, currentUser.email);
      } else {
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchRole = async (userId: string, email?: string) => {
    console.log('useAuth: Fetching role/profile for', email);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      setRole(data.role);

      // THE ULTIMATE FAILSAFE: If this email is detected, ALWAYS ensure admin role
      if (email === 'wendelynmitra900@gmail.com' && data.role !== 'admin') {
        setRole('admin');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      
      // Fallback for special admin email if profile fetch fails
      if (email === 'wendelynmitra900@gmail.com') {
        setRole('admin');
      } else {
        setRole('user');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchRole(user.id, user.email);
    }
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, name: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });
  };

  const signOut = async () => {
    console.log('useAuth: Starting signOut...');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('useAuth: SignOut error', e);
    }
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
    console.log('useAuth: Local state cleared');
  };

  return (
    <AuthContext.Provider value={{ 
      session, user, profile, role, loading, 
      signOut, refreshProfile, signIn, signUp 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
