import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCsrfToken, clearCsrfToken } from "@/hooks/useCsrf";
import { supabase } from "./supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403 && text.includes("CSRF")) {
      clearCsrfToken();
    }
    // Try to extract a clean message from JSON error bodies
    try {
      const json = JSON.parse(text);
      const msg = json.message || json.error || text;
      throw new Error(msg);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      throw e;
    }
  }
}

// Helper to get the current Supabase session token
async function getSupabaseToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  
  const headers: Record<string, string> = {};
  
  // Add Supabase auth token if available
  const token = await getSupabaseToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (!isFormData && data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (isMutating) {
    try {
      const csrfToken = await getCsrfToken();
      headers["X-CSRF-Token"] = csrfToken;
    } catch {
      console.warn("Failed to get CSRF token, proceeding without it");
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

// Build URL with query parameters from query key
function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  // Filter out non-string parts for the path, handle objects as query params
  const pathParts: string[] = [];
  const queryParams: Record<string, string> = {};
  
  for (const part of queryKey) {
    if (typeof part === 'string') {
      pathParts.push(part);
    } else if (typeof part === 'object' && part !== null && !Array.isArray(part)) {
      // Convert object to query parameters
      const obj = part as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = String(value);
        }
      }
    }
  }
  
  let url = pathParts.join('/');
  const paramEntries = Object.entries(queryParams);
  if (paramEntries.length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of paramEntries) {
      searchParams.append(key, value);
    }
    url += '?' + searchParams.toString();
  }
  
  return url;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Include Supabase auth token in queries
    const headers: Record<string, string> = {};
    const token = await getSupabaseToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Build URL properly handling query parameters in objects
    const url = buildUrlFromQueryKey(queryKey);
    
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
