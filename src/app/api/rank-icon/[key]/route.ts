// GET /api/rank-icon/{bracket}-{star} — proxies a Dota 2 rank medal icon.
//
// The source (Fandom's Dota 2 Wiki, which mirrors Valve's original game
// asset) hotlink-protects its CDN: confirmed via curl that the exact same
// URL returns 200 with a dota2.fandom.com Referer and 404 with any other,
// including ours. Fetching it here server-side with the right Referer and
// re-serving the bytes from our own origin sidesteps that — the browser
// never talks to Fandom directly. Long max-age cache since rank medal art
// never changes.

import { NextResponse } from "next/server";
import { RANK_ICON_URLS } from "@/lib/utils";

export const revalidate = 2592000; // 30 days

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const sourceUrl = RANK_ICON_URLS[key];
  if (!sourceUrl) {
    return NextResponse.json({ error: "unknown rank icon key" }, { status: 404 });
  }

  const fetchUpstream = () =>
    fetch(sourceUrl, {
      headers: {
        Referer: "https://dota2.fandom.com/",
        "User-Agent": "dota2-personal-dashboard/1.0 (private)",
      },
      next: { revalidate },
    });

  // A page can render several RankBadges at once, each firing this route
  // concurrently on a cold cache — that burst was enough to trip an
  // occasional connect timeout to the upstream host in testing. One retry
  // covers the transient case without masking a real outage.
  let upstream: Response;
  try {
    upstream = await fetchUpstream();
  } catch {
    try {
      upstream = await fetchUpstream();
    } catch {
      return NextResponse.json({ error: "upstream fetch failed" }, { status: 502 });
    }
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "upstream fetch failed" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/png",
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
