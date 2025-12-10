import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCsrfToken, clearCsrfToken } from "@/hooks/useCsrf";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 403) {
      const text = await res.text();
      if (text.includes("CSRF")) {
        clearCsrfToken();
      }
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
  
  const headers: Record<string, string> = {};
  
  if (!isFormData && data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (isMutating) {
    try {
      const csrfToken = await getCsrfToken();
      headers["X-CSRF-Token"] = csrfToken;
    } catch (error) {
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
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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
