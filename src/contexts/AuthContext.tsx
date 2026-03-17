import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError, Factor } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaRequired: boolean;
  mfaEnrolled: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; mfaRequired?: boolean }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  verifyMfaCode: (code: string, factorId: string) => Promise<{ error: AuthError | null }>;
  enrollMfa: () => Promise<{ qrCode: string; secret: string; factorId: string } | { error: AuthError }>;
  verifyMfaEnrollment: (code: string, factorId: string) => Promise<{ error: AuthError | null }>;
  getMfaFactors: () => Promise<Factor[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);

  // Sign out when the browser window/tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon to reliably sign out on close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/logout`;
      const token = session?.access_token;
      if (token) {
        navigator.sendBeacon(url, '');
        // Also clear local storage to prevent session restoration
        localStorage.removeItem('sb-intivrekbnnevtrjhqzp-auth-token');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Check MFA status after auth state change
        if (session?.user) {
          setTimeout(() => {
            checkMfaStatus();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session?.user) {
        checkMfaStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp?.filter(f => f.status === 'verified') || [];
      setMfaEnrolled(verifiedFactors.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // Check if MFA challenge is required
    if (data.session === null && data.user === null) {
      // This means MFA is required
      setMfaRequired(true);
      return { error: null, mfaRequired: true };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMfaRequired(false);
    setMfaEnrolled(false);
  };

  const verifyMfaCode = async (code: string, factorId: string) => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      return { error: challengeError };
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (!error) {
      setMfaRequired(false);
    }

    return { error };
  };

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error) {
      return { error };
    }

    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  };

  const verifyMfaEnrollment = async (code: string, factorId: string) => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      return { error: challengeError };
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (!error) {
      setMfaEnrolled(true);
    }

    return { error };
  };

  const getMfaFactors = async (): Promise<Factor[]> => {
    const { data } = await supabase.auth.mfa.listFactors();
    return data?.totp || [];
  };

  const isAuthenticated = !!session && !!user && !mfaRequired;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      isLoading,
      mfaRequired,
      mfaEnrolled,
      signIn,
      signUp,
      signOut,
      verifyMfaCode,
      enrollMfa,
      verifyMfaEnrollment,
      getMfaFactors,
    }}>
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
