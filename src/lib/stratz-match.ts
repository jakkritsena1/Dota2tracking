// Live STRATZ match-detail fetch for the match detail page.
// Unlike sync-matches (which only stores the tracked player's own stats),
// this pulls the full 10-player breakdown, draft, and kill events on demand
// when someone views a match — no DB migration or backfill required.
// Field names were confirmed against STRATZ's live GraphQL schema via introspection.

import { stratzGraphQL } from "./stratz-client";

const MATCH_DETAIL_QUERY = `
  query MatchDetail($matchId: Long!) {
    match(id: $matchId) {
      id
      didRadiantWin
      durationSeconds
      radiantKills
      direKills
      radiantNetworthLeads
      radiantExperienceLeads
      topLaneOutcome
      midLaneOutcome
      bottomLaneOutcome
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
        lane
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
        abilities {
          abilityId
          isTalent
          abilityType { name language { displayName } }
        }
        playbackData {
          abilityLearnEvents {
            abilityId
            time
            levelObtained
            isTalent
            isMaxLevel
          }
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

// Team-relative lane assignment, as reported by STRATZ (not map-relative —
// see mapLaneToSide() for converting to top/mid/bottom).
export type LiveLane = "ROAMING" | "SAFE_LANE" | "MID_LANE" | "OFF_LANE" | "JUNGLE" | "UNKNOWN";

export type LiveLaneOutcome =
  | "TIE"
  | "RADIANT_VICTORY"
  | "RADIANT_STOMP"
  | "DIRE_VICTORY"
  | "DIRE_STOMP";

export interface LiveSkillEvent {
  abilityId: number;
  name: string; // internal shortname, for the CDN icon URL
  displayName: string;
  levelObtained: number;
  time: number;
  isTalent: boolean;
  isMaxLevel: boolean;
}

export interface LiveMatchPlayer {
  steamAccountId: number;
  name: string | null;
  avatar: string | null;
  isRadiant: boolean;
  heroId: number;
  lane: LiveLane | null;
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
  skillBuild: LiveSkillEvent[];
}

export interface LiveMatchDetail {
  id: number;
  didRadiantWin: boolean;
  durationSeconds: number;
  radiantKills: number[];
  direKills: number[];
  radiantNetworthLeads: number[]; // per-minute, positive = Radiant ahead
  radiantExperienceLeads: number[]; // per-minute, positive = Radiant ahead
  laneOutcomes: {
    top: LiveLaneOutcome | null;
    mid: LiveLaneOutcome | null;
    bottom: LiveLaneOutcome | null;
  };
  pickBans: LivePickBan[];
  players: LiveMatchPlayer[];
}

// STRATZ's `lane` field on a player is team-relative (SAFE_LANE / OFF_LANE),
// but the matchup UI wants map-relative lanes (top/mid/bottom) so heroes
// from both teams line up in the same row. Radiant's safe lane is the map's
// bottom lane; Dire's safe lane is the map's top lane, and vice versa.
export function mapLaneToSide(lane: LiveLane | null, isRadiant: boolean): "top" | "mid" | "bottom" | null {
  if (lane === "MID_LANE") return "mid";
  if (lane === "SAFE_LANE") return isRadiant ? "bottom" : "top";
  if (lane === "OFF_LANE") return isRadiant ? "top" : "bottom";
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw STRATZ GraphQL response shape, mapped just below
type RawMatch = any;

// Match data is immutable once the game ends — safe to cache for a day so
// repeat views of the same match don't re-hit STRATZ. This replaces the
// fetch()-based `next: { revalidate }` cache that used to do this job;
// stratzGraphQL() uses Node's https module instead of fetch() (see
// stratz-client.ts for why), so Next's fetch cache no longer applies here.
// A plain module-scope Map is a fine substitute — it persists for the
// lifetime of the serverless instance, which is what the fetch cache
// effectively gave us in practice.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const detailCache = new Map<number, { detail: LiveMatchDetail; expiresAt: number }>();

export async function getLiveMatchDetail(matchId: number): Promise<LiveMatchDetail | null> {
  const cached = detailCache.get(matchId);
  if (cached && cached.expiresAt > Date.now()) return cached.detail;

  const data = await stratzGraphQL<{ match: RawMatch }>(MATCH_DETAIL_QUERY, { matchId });
  const m = data?.match;
  if (!m) return null;

  const detail: LiveMatchDetail = {
    id: m.id,
    didRadiantWin: m.didRadiantWin,
    durationSeconds: m.durationSeconds,
    radiantKills: m.radiantKills ?? [],
    direKills: m.direKills ?? [],
    radiantNetworthLeads: m.radiantNetworthLeads ?? [],
    radiantExperienceLeads: m.radiantExperienceLeads ?? [],
    laneOutcomes: {
      top: m.topLaneOutcome ?? null,
      mid: m.midLaneOutcome ?? null,
      bottom: m.bottomLaneOutcome ?? null,
    },
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
      lane: p.lane ?? null,
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
      skillBuild: mapSkillBuild(p),
    })),
  };

  detailCache.set(matchId, { detail, expiresAt: Date.now() + CACHE_TTL_MS });
  return detail;
}

// `playbackData.abilityLearnEvents` (the actual skill-up order) doesn't carry
// the ability's name — only `abilityId`. But `player.abilities` (the cast
// log) resolves every abilityId this player used to a name/displayName, so
// we build a lookup from that instead of maintaining a separate static
// ability-name table.
function mapSkillBuild(p: RawMatch): LiveSkillEvent[] {
  const nameByAbilityId = new Map<number, { name: string; displayName: string }>();
  for (const a of p.abilities ?? []) {
    if (a.abilityId == null || nameByAbilityId.has(a.abilityId)) continue;
    nameByAbilityId.set(a.abilityId, {
      name: a.abilityType?.name ?? `ability_${a.abilityId}`,
      displayName: a.abilityType?.language?.displayName ?? a.abilityType?.name ?? `Ability #${a.abilityId}`,
    });
  }

  return (p.playbackData?.abilityLearnEvents ?? []).map((e: RawMatch) => {
    const resolved = nameByAbilityId.get(e.abilityId);
    return {
      abilityId: e.abilityId,
      name: resolved?.name ?? `ability_${e.abilityId}`,
      displayName: resolved?.displayName ?? `Ability #${e.abilityId}`,
      levelObtained: e.levelObtained,
      time: e.time,
      isTalent: e.isTalent ?? false,
      isMaxLevel: e.isMaxLevel ?? false,
    };
  });
}
