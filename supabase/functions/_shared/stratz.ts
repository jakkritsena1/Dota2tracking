// Shared STRATZ GraphQL client for Edge Functions (Deno)

const STRATZ_API_URL = "https://api.stratz.com/graphql";

export interface StratzConfig {
  apiKey: string;
  steamAccountId: number;
}

async function query<T>(
  gql: string,
  variables: Record<string, unknown>,
  apiKey: string,
): Promise<T> {
  const resp = await fetch(STRATZ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "User-Agent": "dota2-personal-dashboard/1.0 (private)",
    },
    body: JSON.stringify({ query: gql, variables }),
  });

  if (resp.status === 429) {
    throw new Error("STRATZ_RATE_LIMIT");
  }
  if (!resp.ok) {
    throw new Error(`STRATZ_HTTP_${resp.status}`);
  }

  const json = await resp.json();
  if (json.errors?.length) {
    throw new Error(`STRATZ_GQL: ${json.errors[0].message}`);
  }
  return json.data as T;
}

// ── Queries ──────────────────────────────────────────────────

const PLAYER_PROFILE_QUERY = `
  query PlayerProfile($steamAccountId: Long!) {
    player(steamAccountId: $steamAccountId) {
      steamAccount {
        id
        name
        avatar
        seasonRank
        seasonLeaderboardRank
        isDotaPlusSubscriber
        proSteamAccount { name }
      }
    }
  }
`;

const RECENT_MATCHES_QUERY = `
  query PlayerMatches($steamAccountId: Long!, $take: Int!, $skip: Int) {
    player(steamAccountId: $steamAccountId) {
      matches(request: {
        take: $take
        skip: $skip
        lobbyTypeIds: [0, 7]
        orderBy: DESC
      }) {
        id
        startDateTime
        durationSeconds
        gameMode
        lobbyType
        players(steamAccountId: $steamAccountId) {
          isVictory
          heroId
          role
          lane
          kills
          deaths
          assists
          networth
          goldPerMinute
          experiencePerMinute
          numLastHits
          numDenies
          heroDamage
          towerDamage
          heroHealing
          imp
          leaverStatus
          stats {
            networthPerMinute
            lastHitsPerMinute
          }
        }
      }
    }
  }
`;

const MATCH_DETAIL_QUERY = `
  query MatchDetail($matchId: Long!) {
    match(id: $matchId) {
      id
      startDateTime
      durationSeconds
      gameMode
      lobbyType
      didRadiantWin
      players {
        steamAccount { id }
        heroId
        isVictory
        role
        lane
        kills
        deaths
        assists
        networth
        goldPerMinute
        experiencePerMinute
        numLastHits
        numDenies
        heroDamage
        towerDamage
        heroHealing
        imp
        stats { networthPerMinute }
      }
      playbackData {
        radiantNetworthLeads
        radiantExperienceLeads
      }
    }
  }
`;

const HERO_META_QUERY = `
  query HeroMeta($bracketIds: [RankBracket], $positionIds: [MatchPlayerPositionType]) {
    heroStats {
      winDay(bracketIds: $bracketIds, positionIds: $positionIds) {
        heroId
        winCount
        matchCount
        day
      }
    }
  }
`;

// ── Mapped types ─────────────────────────────────────────────

export interface StratzPlayerProfile {
  name: string;
  avatar: string;
  seasonRank: number | null;
  seasonLeaderboardRank: number | null;
  isDotaPlusSubscriber: boolean;
}

export interface StratzMatchPlayer {
  isVictory: boolean;
  heroId: number;
  role: string;
  lane: string;
  kills: number;
  deaths: number;
  assists: number;
  networth: number;
  goldPerMinute: number;
  experiencePerMinute: number;
  numLastHits: number;
  numDenies: number;
  heroDamage: number;
  towerDamage: number;
  heroHealing: number;
  imp: number | null;
  stats?: {
    networthPerMinute?: number[];
    lastHitsPerMinute?: number[];
  };
}

export interface StratzMatch {
  id: number;
  startDateTime: number;
  durationSeconds: number;
  gameMode: string;
  lobbyType: string;
  players: StratzMatchPlayer[];
}

// ── API methods ───────────────────────────────────────────────

export async function getPlayerProfile(
  cfg: StratzConfig,
): Promise<StratzPlayerProfile | null> {
  const data = await query<{
    player: { steamAccount: StratzPlayerProfile | null };
  }>(PLAYER_PROFILE_QUERY, { steamAccountId: cfg.steamAccountId }, cfg.apiKey);
  return data.player?.steamAccount ?? null;
}

export async function getCurrentRankTier(cfg: StratzConfig): Promise<number | null> {
  const profile = await getPlayerProfile(cfg);
  return profile?.seasonRank ?? null;
}

export async function getRecentMatches(
  cfg: StratzConfig,
  take = 50,
  skip = 0,
): Promise<StratzMatch[]> {
  const data = await query<{ player: { matches: StratzMatch[] } }>(
    RECENT_MATCHES_QUERY,
    { steamAccountId: cfg.steamAccountId, take, skip },
    cfg.apiKey,
  );
  return data.player?.matches ?? [];
}

export async function getMatchDetail(
  cfg: StratzConfig,
  matchId: number,
): Promise<unknown | null> {
  const data = await query<{ match: unknown }>(
    MATCH_DETAIL_QUERY,
    { matchId },
    cfg.apiKey,
  );
  return data.match ?? null;
}

// STRATZ returns `day` as a Unix timestamp (number), not a string — one row
// per hero *per day* (an ~8-day trailing series), not one row per hero.
export async function getHeroMeta(
  apiKey: string,
  bracketIds: string[],
  positionIds: string[],
): Promise<Array<{ heroId: number; winCount: number; matchCount: number; day: number }>> {
  const data = await query<{
    heroStats: { winDay: Array<{ heroId: number; winCount: number; matchCount: number; day: number }> };
  }>(HERO_META_QUERY, { bracketIds, positionIds }, apiKey);
  return data.heroStats?.winDay ?? [];
}

// ── Role / lane mapping from STRATZ enums ─────────────────────

const ROLE_MAP: Record<string, string> = {
  POSITION_1: "carry",
  POSITION_2: "mid",
  POSITION_3: "offlane",
  POSITION_4: "support",
  POSITION_5: "hardsupport",
  CORE: "carry",
  LIGHT_SUPPORT: "support",
  HARD_SUPPORT: "hardsupport",
};

const LANE_MAP: Record<string, string> = {
  SAFE_LANE: "safelane",
  MID_LANE: "midlane",
  OFF_LANE: "offlane",
  JUNGLE: "jungle",
  ROAMING: "roaming",
};

export function mapRole(stratzRole: string | null): string | null {
  if (!stratzRole) return null;
  return ROLE_MAP[stratzRole] ?? stratzRole.toLowerCase();
}

export function mapLane(stratzLane: string | null): string | null {
  if (!stratzLane) return null;
  return LANE_MAP[stratzLane] ?? stratzLane.toLowerCase();
}

export function rankTierToBracket(rankTier: number | null): string {
  if (!rankTier) return "archon"; // sensible default
  const bracket = Math.floor(rankTier / 10);
  const brackets = ["","herald","guardian","crusader","archon","legend","ancient","divine","immortal"];
  return brackets[bracket] ?? "archon";
}
