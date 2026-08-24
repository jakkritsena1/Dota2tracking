// Server-side Supabase client — anon key + the caller's session cookie.
// Runs AS the logged-in user, so RLS actually applies. Use this for any
// Server Component / Route Handler that reads/writes per-user data
// (matches, goals, weaknesses, the scoped RPCs).
//
// For admin/background paths (edge functions, the sync trigger, the
// one-off backfill) keep using getServerSupabase() from ./server.ts,
// which bypasses RLS via the service_role key.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getServerSupabaseForUser() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component render — the middleware already
          // refreshes the session cookie on every request, so this is safe to ignore.
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // See note above.
        }
      },
    },
  });
}
