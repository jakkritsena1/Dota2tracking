// Live STRATZ match-detail fetch for the match detail page.
// Unlike sync-matches (which only stores the tracked player's own stats),
// this pulls the full 10-player breakdown, draft, and kill events on demand
// when someone views a match — no DB migration or backfill required.
// Field names were confirmed against STRATZ's live GraphQL schema via introspection.

const STRATZ_API_URL = "https://api.stratz.com/graphql";

const MATCH_DETAIL_QUERY = `
  query MatchDetail($matchId: Long!) {
    match(id: $matchId) {
      id
      didRadiantWin
      durationSeconds
      radiantKills
      direKills
      pickBans {
        isPick
        heroId
        bannedHeroId
        isRadiant
        order
        playerIndex
      }
      players {
        steamAccountId
        steamAccount { id name avatar }
        isRadiant
        heroId
        kills
        deaths
        assists
        level
        networth
        goldPerMinute
        experiencePerMinute
        numLastHits
        numDenies
        heroDamage
        towerDamage
        heroHealing
        imp
        item0Id
        item1Id
        item2Id
        item3Id
        item4Id
        item5Id
        backpack0Id
        backpack1Id
        backpack2Id
        neutral0Id
        stats {
          killEvents { time target }
        }
      }
    }
  }
`;

export interface LivePickBan {
  isPick: boolean;
  heroId: number | null;
  bannedHeroId: number | null;
  isRadiant: boolean | null;
  order: number | null;
  playerIndex: number | null;
}

export interface LiveKillEvent {
  time: number;
  target: number; // victim hero id
}

export interface LiveMatchPlayer {
  steamAccountId: number;
  name: string | null;
  avatar: string | null;
  isRadiant: boolean;
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  level: number;
  networth: number;
  gpm: number;
  xpm: number;
  lastHits: number;
  denies: number;
  heroDamage: number;
  towerDamage: number;
  healing: number;
  imp: number | null;
  items: number[]; // 6 slots, 0 = empty
  backpack: number[]; // 3 slots, 0 = empty
  neutralItem: number | null;
  killEvents: LiveKillEvent[];
}

export interface LiveMatchDetail {
  id: number;
  didRadiantWin: boolean;
  durationSeconds: number;
  radiantKills: number[];
  direKills: number[];
  pickBans: LivePickBan[];
  players: LiveMatchPlayer[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw STRATZ GraphQL response shape, mapped just below
type RawMatch = any;

export async function getLiveMatchDetail(matchId: number): Promise<LiveMatchDetail | null> {
  const apiKey = process.env.STRATZ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(STRATZ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "dota2-personal-dashboard/1.0 (private)",
      },
      body: JSON.stringify({
        query: MATCH_DETAIL_QUERY,
        variables: { matchId },
      }),
      // Match data is immutable once the game ends — safe to cache for a day
      // so repeat views of the same match don't re-hit STRATZ's rate limit.
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.error(`[stratz-match] HTTP ${res.status} for match ${matchId}`);
      return null;
    }

    const json = await res.json();
    if (json.errors?.length) {
      console.error(`[stratz-match] GraphQL error for match ${matchId}:`, json.errors[0].message);
      return null;
    }

    const m: RawMatch = json?.data?.match;
    if (!m) return null;

    return {
      id: m.id,
      didRadiantWin: m.didRadiantWin,
      durationSeconds: m.durationSeconds,
      radiantKills: m.radiantKills ?? [],
      direKills: m.direKills ?? [],
      pickBans: (m.pickBans ?? []).map((pb: RawMatch) => ({
        isPick: pb.isPick,
        heroId: pb.heroId ?? null,
        bannedHeroId: pb.bannedHeroId ?? null,
        isRadiant: pb.isRadiant ?? null,
        order: pb.order ?? null,
        playerIndex: pb.playerIndex ?? null,
      })),
      players: (m.players ?? []).map((p: RawMatch) => ({
        steamAccountId: p.steamAccountId,
        name: p.steamAccount?.name ?? null,
        avatar: p.steamAccount?.avatar ?? null,
        isRadiant: p.isRadiant,
        heroId: p.heroId,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        assists: p.assists ?? 0,
        level: p.level ?? 0,
        networth: p.networth ?? 0,
        gpm: p.goldPerMinute ?? 0,
        xpm: p.experiencePerMinute ?? 0,
        lastHits: p.numLastHits ?? 0,
        denies: p.numDenies ?? 0,
        heroDamage: p.heroDamage ?? 0,
        towerDamage: p.towerDamage ?? 0,
        healing: p.heroHealing ?? 0,
        imp: p.imp ?? null,
        items: [p.item0Id, p.item1Id, p.item2Id, p.item3Id, p.item4Id, p.item5Id].map(
          (id) => id ?? 0,
        ),
        backpack: [p.backpack0Id, p.backpack1Id, p.backpack2Id].map((id) => id ?? 0),
        neutralItem: p.neutral0Id || null,
        killEvents: (p.stats?.killEvents ?? []).map((k: RawMatch) => ({
          time: k.time,
          target: k.target,
        })),
      })),
    };
  } catch (err) {
    console.error(`[stratz-match] fetch threw for match ${matchId}:`, err);
    return null;
  }
}
