import { useEffect, useState } from "react";

let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = fetch("/api/csrf-token", {
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      cachedToken = data.csrfToken;
      tokenFetchPromise = null;
      return cachedToken!;
    })
    .catch((error) => {
      tokenFetchPromise = null;
      console.error("Failed to fetch CSRF token:", error);
      throw error;
    });

  return tokenFetchPromise;
}

export function clearCsrfToken(): void {
  cachedToken = null;
  tokenFetchPromise = null;
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
