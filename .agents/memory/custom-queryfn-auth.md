---
name: Custom queryFn auth pattern
description: Using raw fetch() in a custom queryFn silently drops the Supabase Bearer token, causing 401s even for logged-in users.
---

## Rule
Never use a raw `fetch()` call inside a custom `queryFn` for authenticated endpoints. The default TanStack Query fetcher (`getQueryFn` in `client/src/lib/queryClient.ts`) automatically adds `Authorization: Bearer <supabase_access_token>`. A custom `queryFn` with only `credentials: "include"` skips this and gets a 401.

**Why:** `isAuthenticated` middleware in `server/supabase-middleware.ts` checks `req.supabaseUser`, which is only populated by `supabaseAuthMiddleware` when an `Authorization: Bearer` header is present. Cookies alone are not sufficient.

**How to apply:**
- For GET requests with query params: pass params as an object in the query key array — `queryKey: ["/api/endpoint", { param1: val1, param2: val2 }]` — and omit `queryFn`. The default fetcher's `buildUrlFromQueryKey` will construct the URL with query string, and add the Bearer token.
- For mutations (POST/PUT/PATCH/DELETE): use `apiRequest` from `@/lib/queryClient` which also adds the Bearer token.
- If a custom `queryFn` is unavoidable (e.g. streaming, file download), import `getSupabaseToken` (or call `supabase.auth.getSession()`) and add the header manually.
