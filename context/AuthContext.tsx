'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { userAPI } from '@/lib/api';
import type { Database } from '@/lib/database.types';

type User = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUp: (email: string, password: string, name: string, role: User['role']) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        userAPI.getCurrentUser().then(setUser);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const user = await userAPI.getCurrentUser();
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Start redirect early
      router.prefetch('/dashboard');

      // First attempt login without timeout
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!user) throw new Error('No user returned from login');

      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        
        setUser(profile);
        router.push('/dashboard');
        
        return {
          success: true,
          message: 'Successfully logged in!'
        };
      } catch (profileError) {
        console.error('Profile fetch error:', profileError);
        // Even if profile fetch fails, we can still redirect to dashboard
        // The profile will be fetched again by the useEffect hook
        router.push('/dashboard');
        return {
          success: true,
          message: 'Logged in, loading profile...'
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // Provide more specific error messages
      if (error.message?.includes('timeout')) {
        throw new Error('Connection is slow. Please check your internet and try again.');
      } else if (error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      } else if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      } else {
        throw error;
      }
    }
  };

  const signUp = async (email: string, password: string, name: string, role: User['role']) => {
    try {
      console.log('Starting auth signup...');
      
      // Step 1: Sign up with Supabase Auth
      const { data: { user: authUser }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      });

      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        throw signUpError;
      }
      
      if (!authUser?.id) {
        console.error('No user ID returned from sign up');
        throw new Error('No user ID returned from sign up');
      }

      console.log('Auth signup successful, creating user profile...', { userId: authUser.id });
      
      // Step 2: Create user profile through our API route
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: authUser.id,
          email,
          name,
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Profile creation error:', error);
        throw new Error(error.error || 'Failed to create user profile');
      }

      const { data: profileData } = await response.json();

      if (!profileData) {
        console.error('No profile data returned after insert');
        throw new Error('Failed to create user profile');
      }

      console.log('Profile created successfully:', profileData);
      
      console.log('Redirecting to login page...');
      router.push('/auth/login?signup=success');
      return {
        success: true,
        message: 'Account created successfully! Please check your email to verify your account before logging in.',
      };
    } catch (error: any) {
      console.error('Signup process error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
