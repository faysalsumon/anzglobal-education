import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;
let tokenGeneration = 0; // Tracks cache invalidation to prevent race conditions

async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  const currentGeneration = tokenGeneration;
  
  tokenFetchPromise = (async () => {
    // Get Supabase access token to include in the request
    // This ensures the CSRF token is generated with the correct session identifier
    const headers: Record<string, string> = {};
    const accessToken = await getSupabaseAccessToken();
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch("/api/csrf-token", {
      credentials: "include",
      headers,
    });
    const data = await res.json();
    
    // Only update cache if generation hasn't changed (no clearCsrfToken called during fetch)
    if (tokenGeneration === currentGeneration) {
      cachedToken = data.csrfToken;
      tokenFetchPromise = null;
      return cachedToken!;
    } else {
      // Cache was cleared during fetch (auth state changed), discard this token
      tokenFetchPromise = null;
      // Fetch a fresh token with the new auth state
      return getCsrfToken();
    }
  })().catch((error) => {
    tokenFetchPromise = null;
    console.error("Failed to fetch CSRF token:", error);
    throw error;
  });

  return tokenFetchPromise;
}

export function clearCsrfToken(): void {
  cachedToken = null;
  tokenFetchPromise = null;
  tokenGeneration++; // Increment to invalidate any in-flight fetches
}

export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [isLoading, setIsLoading] = useState(!cachedToken);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedToken) {
      setToken(cachedToken);
      setIsLoading(false);
      return;
    }

    getCsrfToken()
      .then((t) => {
        setToken(t);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, []);

  const refresh = async () => {
    clearCsrfToken();
    setIsLoading(true);
    try {
      const newToken = await getCsrfToken();
      setToken(newToken);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return { token, isLoading, error, refresh };
}
