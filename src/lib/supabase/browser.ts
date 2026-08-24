// Browser-side Supabase client — anon key, respects RLS as the logged-in user.
// Only for client components that need auth state (e.g. the logout button).

import { createBrowserClient } from "@supabase/ssr";

export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
