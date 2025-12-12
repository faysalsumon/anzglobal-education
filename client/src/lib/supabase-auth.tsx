import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { User, Session, AuthError, AuthChangeEvent } from "@supabase/supabase-js";

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string; userType?: string }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  setupTOTP: () => Promise<{ qr: string; secret: string } | { error: AuthError }>;
  verifyTOTP: (code: string, factorId: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: "google" | "github" | "facebook") => Promise<{ error: AuthError | null }>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

const notConfiguredError = { message: "Supabase is not configured" } as AuthError;

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string; userType?: string }
  ) => {
    if (!supabase) return { error: notConfiguredError };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata?.firstName,
          last_name: metadata?.lastName,
          user_type: metadata?.userType || "student",
        },
      },
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: notConfiguredError };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return { error: notConfiguredError };
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: notConfiguredError };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return { error: notConfiguredError };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const setupTOTP = useCallback(async () => {
    if (!supabase) return { error: notConfiguredError };
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      return { error };
    }
    return {
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    };
  }, []);

  const verifyTOTP = useCallback(async (code: string, factorId: string) => {
    if (!supabase) return { error: notConfiguredError };
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) {
      return { error };
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: data.id,
      code,
    });
    return { error: verifyError };
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "github" | "facebook") => {
    if (!supabase) return { error: notConfiguredError };
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const value: SupabaseAuthContextType = {
    user,
    session,
    isLoading,
    isConfigured: configured,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    setupTOTP,
    verifyTOTP,
    signInWithOAuth,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error("useSupabaseAuth must be used within a SupabaseAuthProvider");
  }
  return context;
}
