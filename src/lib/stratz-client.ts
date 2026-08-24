// Shared STRATZ GraphQL client for server-side (Node) callers.
//
// Deliberately uses Node's built-in `https` module instead of the global
// `fetch()` (undici). STRATZ sits behind Cloudflare bot management that
// fingerprints undici's TLS/HTTP2 client and blocks it with a 403 challenge
// page — verified directly: curl and Node's `https` module both get a clean
// 200, `fetch()` with identical headers gets Cloudflare's "Just a moment..."
// challenge every time. Since Vercel's Node runtime uses the same undici
// fetch, this wasn't a local-only quirk — it silently broke every
// STRATZ-backed feature in production (e.g. new logins never got a
// persona_name/avatar_url, because fetchStratzProfile() always failed).

import https from "node:https";

const STRATZ_API_URL = "https://api.stratz.com/graphql";
const USER_AGENT = "dota2-personal-dashboard/1.0 (private)";

export async function stratzGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> {
  const apiKey = process.env.STRATZ_API_KEY;
  if (!apiKey) {
    console.error("[stratz-client] STRATZ_API_KEY is not set");
    return null;
  }

  const body = JSON.stringify({ query, variables });

  return new Promise((resolve) => {
    const req = https.request(
      STRATZ_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": USER_AGENT,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            console.error(`[stratz-client] HTTP ${res.statusCode}`);
            resolve(null);
            return;
          }
          try {
            const json = JSON.parse(data);
            if (json.errors?.length) {
              console.error("[stratz-client] GraphQL error:", json.errors[0].message);
              resolve(null);
              return;
            }
            resolve(json.data as T);
          } catch (err) {
            console.error("[stratz-client] failed to parse response:", err);
            resolve(null);
          }
        });
      },
    );

    req.on("error", (err) => {
      console.error("[stratz-client] request failed:", err);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}
