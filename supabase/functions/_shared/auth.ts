// Verifies that an Edge Function request comes from an authorised caller
// (cron via pg_net, or a server-side Next.js trigger).
// Returns 401 Response if rejected, null if OK.

export function verifyServiceRole(req: Request): Response | null {
  const auth = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("INTERNAL_API_SECRET") ?? ""}`;

  if (!auth || auth !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
