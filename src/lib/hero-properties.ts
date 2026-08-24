// Static hero style vectors for hero advisor cosine-similarity scoring.
// Dimensions: [farm_dependency, fight_timing, complexity, game_length_affinity, mobility]
// All values 0–1.
// farm_dependency: 0=support, 1=hard carry
// fight_timing:    0=late, 1=early
// complexity:      0=simple, 1=complex
// game_length_affinity: 0=short, 1=long
// mobility:        0=immobile, 1=high mobility

export interface HeroStyleVector {
  farm_dependency: number;
  fight_timing: number;
  complexity: number;
  game_length_affinity: number;
  mobility: number;
}

export const HERO_STYLES: Record<number, HeroStyleVector> = {
  1:   { farm_dependency: 0.95, fight_timing: 0.2,  complexity: 0.5,  game_length_affinity: 0.95, mobility: 0.8  }, // Anti-Mage
  2:   { farm_dependency: 0.4,  fight_timing: 0.85, complexity: 0.3,  game_length_affinity: 0.4,  mobility: 0.3  }, // Axe
  3:   { farm_dependency: 0.2,  fight_timing: 0.5,  complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.2  }, // Bane
  4:   { farm_dependency: 0.6,  fight_timing: 0.7,  complexity: 0.4,  game_length_affinity: 0.5,  mobility: 0.6  }, // Bloodseeker
  5:   { farm_dependency: 0.2,  fight_timing: 0.6,  complexity: 0.4,  game_length_affinity: 0.5,  mobility: 0.2  }, // Crystal Maiden
  6:   { farm_dependency: 0.75, fight_timing: 0.4,  complexity: 0.3,  game_length_affinity: 0.7,  mobility: 0.3  }, // Drow Ranger
  7:   { farm_dependency: 0.3,  fight_timing: 0.7,  complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.2  }, // Earthshaker
  8:   { farm_dependency: 0.7,  fight_timing: 0.6,  complexity: 0.4,  game_length_affinity: 0.65, mobility: 0.6  }, // Juggernaut
  9:   { farm_dependency: 0.4,  fight_timing: 0.7,  complexity: 0.7,  game_length_affinity: 0.5,  mobility: 0.8  }, // Mirana
  10:  { farm_dependency: 0.85, fight_timing: 0.5,  complexity: 0.9,  game_length_affinity: 0.75, mobility: 0.8  }, // Morphling
  11:  { farm_dependency: 0.7,  fight_timing: 0.55, complexity: 0.5,  game_length_affinity: 0.6,  mobility: 0.4  }, // Shadow Fiend
  12:  { farm_dependency: 0.85, fight_timing: 0.3,  complexity: 0.5,  game_length_affinity: 0.85, mobility: 0.6  }, // Phantom Lancer
  13:  { farm_dependency: 0.4,  fight_timing: 0.7,  complexity: 0.7,  game_length_affinity: 0.5,  mobility: 0.9  }, // Puck
  14:  { farm_dependency: 0.3,  fight_timing: 0.8,  complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.2  }, // Pudge
  15:  { farm_dependency: 0.6,  fight_timing: 0.7,  complexity: 0.3,  game_length_affinity: 0.55, mobility: 0.3  }, // Razor
  16:  { farm_dependency: 0.3,  fight_timing: 0.7,  complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.4  }, // Sand King
  17:  { farm_dependency: 0.6,  fight_timing: 0.7,  complexity: 0.7,  game_length_affinity: 0.55, mobility: 0.95 }, // Storm Spirit
  18:  { farm_dependency: 0.7,  fight_timing: 0.7,  complexity: 0.3,  game_length_affinity: 0.65, mobility: 0.3  }, // Sven
  19:  { farm_dependency: 0.5,  fight_timing: 0.8,  complexity: 0.4,  game_length_affinity: 0.5,  mobility: 0.5  }, // Tiny
  20:  { farm_dependency: 0.2,  fight_timing: 0.7,  complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.4  }, // Vengeful Spirit
  21:  { farm_dependency: 0.5,  fight_timing: 0.6,  complexity: 0.5,  game_length_affinity: 0.55, mobility: 0.6  }, // Windranger
  22:  { farm_dependency: 0.4,  fight_timing: 0.8,  complexity: 0.4,  game_length_affinity: 0.4,  mobility: 0.2  }, // Zeus
  23:  { farm_dependency: 0.45, fight_timing: 0.75, complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.3  }, // Kunkka
  25:  { farm_dependency: 0.4,  fight_timing: 0.7,  complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.3  }, // Lina
  26:  { farm_dependency: 0.2,  fight_timing: 0.7,  complexity: 0.5,  game_length_affinity: 0.45, mobility: 0.2  }, // Lion
  27:  { farm_dependency: 0.2,  fight_timing: 0.6,  complexity: 0.5,  game_length_affinity: 0.45, mobility: 0.2  }, // Shadow Shaman
  28:  { farm_dependency: 0.55, fight_timing: 0.8,  complexity: 0.3,  game_length_affinity: 0.55, mobility: 0.5  }, // Slardar
  29:  { farm_dependency: 0.35, fight_timing: 0.6,  complexity: 0.4,  game_length_affinity: 0.6,  mobility: 0.2  }, // Tidehunter
  30:  { farm_dependency: 0.2,  fight_timing: 0.6,  complexity: 0.4,  game_length_affinity: 0.5,  mobility: 0.2  }, // Witch Doctor
  31:  { farm_dependency: 0.2,  fight_timing: 0.6,  complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.2  }, // Lich
  32:  { farm_dependency: 0.6,  fight_timing: 0.7,  complexity: 0.4,  game_length_affinity: 0.55, mobility: 0.6  }, // Riki
  33:  { farm_dependency: 0.4,  fight_timing: 0.6,  complexity: 0.7,  game_length_affinity: 0.6,  mobility: 0.2  }, // Enigma
  34:  { farm_dependency: 0.65, fight_timing: 0.5,  complexity: 0.9,  game_length_affinity: 0.65, mobility: 0.7  }, // Tinker
  35:  { farm_dependency: 0.7,  fight_timing: 0.3,  complexity: 0.3,  game_length_affinity: 0.75, mobility: 0.1  }, // Sniper
  36:  { farm_dependency: 0.45, fight_timing: 0.6,  complexity: 0.4,  game_length_affinity: 0.6,  mobility: 0.2  }, // Necrophos
  37:  { farm_dependency: 0.2,  fight_timing: 0.5,  complexity: 0.5,  game_length_affinity: 0.6,  mobility: 0.1  }, // Warlock
  38:  { farm_dependency: 0.45, fight_timing: 0.7,  complexity: 0.6,  game_length_affinity: 0.55, mobility: 0.4  }, // Beastmaster
  39:  { farm_dependency: 0.55, fight_timing: 0.75, complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.8  }, // Queen of Pain
  40:  { farm_dependency: 0.4,  fight_timing: 0.5,  complexity: 0.4,  game_length_affinity: 0.6,  mobility: 0.2  }, // Venomancer
  41:  { farm_dependency: 0.8,  fight_timing: 0.5,  complexity: 0.6,  game_length_affinity: 0.7,  mobility: 0.5  }, // Faceless Void
  42:  { farm_dependency: 0.7,  fight_timing: 0.6,  complexity: 0.2,  game_length_affinity: 0.65, mobility: 0.3  }, // Wraith King
  43:  { farm_dependency: 0.5,  fight_timing: 0.6,  complexity: 0.4,  game_length_affinity: 0.55, mobility: 0.3  }, // Death Prophet
  44:  { farm_dependency: 0.8,  fight_timing: 0.5,  complexity: 0.4,  game_length_affinity: 0.7,  mobility: 0.6  }, // Phantom Assassin
  45:  { farm_dependency: 0.4,  fight_timing: 0.65, complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.3  }, // Pugna
  46:  { farm_dependency: 0.8,  fight_timing: 0.5,  complexity: 0.6,  game_length_affinity: 0.7,  mobility: 0.5  }, // Templar Assassin
  47:  { farm_dependency: 0.55, fight_timing: 0.6,  complexity: 0.3,  game_length_affinity: 0.6,  mobility: 0.2  }, // Viper
  48:  { farm_dependency: 0.75, fight_timing: 0.4,  complexity: 0.3,  game_length_affinity: 0.7,  mobility: 0.4  }, // Luna
  49:  { farm_dependency: 0.55, fight_timing: 0.65, complexity: 0.3,  game_length_affinity: 0.65, mobility: 0.2  }, // Dragon Knight
  50:  { farm_dependency: 0.2,  fight_timing: 0.6,  complexity: 0.5,  game_length_affinity: 0.55, mobility: 0.2  }, // Dazzle
  51:  { farm_dependency: 0.35, fight_timing: 0.85, complexity: 0.6,  game_length_affinity: 0.45, mobility: 0.6  }, // Clockwerk
  52:  { farm_dependency: 0.5,  fight_timing: 0.7,  complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.3  }, // Leshrac
  53:  { farm_dependency: 0.6,  fight_timing: 0.5,  complexity: 0.7,  game_length_affinity: 0.6,  mobility: 0.7  }, // Nature's Prophet
  54:  { farm_dependency: 0.75, fight_timing: 0.65, complexity: 0.4,  game_length_affinity: 0.65, mobility: 0.3  }, // Lifestealer
  55:  { farm_dependency: 0.4,  fight_timing: 0.7,  complexity: 0.7,  game_length_affinity: 0.55, mobility: 0.4  }, // Dark Seer
  56:  { farm_dependency: 0.7,  fight_timing: 0.5,  complexity: 0.4,  game_length_affinity: 0.6,  mobility: 0.7  }, // Clinkz
  57:  { farm_dependency: 0.25, fight_timing: 0.7,  complexity: 0.4,  game_length_affinity: 0.5,  mobility: 0.3  }, // Omniknight
  58:  { farm_dependency: 0.75, fight_timing: 0.7,  complexity: 0.4,  game_length_affinity: 0.6,  mobility: 0.5  }, // Chaos Knight
  59:  { farm_dependency: 0.85, fight_timing: 0.4,  complexity: 0.95, game_length_affinity: 0.75, mobility: 0.7  }, // Meepo
  60:  { farm_dependency: 0.2,  fight_timing: 0.5,  complexity: 0.5,  game_length_affinity: 0.6,  mobility: 0.1  }, // Treant Protector
  61:  { farm_dependency: 0.2,  fight_timing: 0.8,  complexity: 0.2,  game_length_affinity: 0.45, mobility: 0.1  }, // Ogre Magi
  62:  { farm_dependency: 0.3,  fight_timing: 0.8,  complexity: 0.4,  game_length_affinity: 0.5,  mobility: 0.2  }, // Undying
  63:  { farm_dependency: 0.3,  fight_timing: 0.7,  complexity: 0.9,  game_length_affinity: 0.5,  mobility: 0.5  }, // Rubick
  64:  { farm_dependency: 0.2,  fight_timing: 0.7,  complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.2  }, // Disruptor
  65:  { farm_dependency: 0.35, fight_timing: 0.75, complexity: 0.6,  game_length_affinity: 0.4,  mobility: 0.7  }, // Nyx Assassin
  66:  { farm_dependency: 0.85, fight_timing: 0.3,  complexity: 0.6,  game_length_affinity: 0.85, mobility: 0.4  }, // Naga Siren
  67:  { farm_dependency: 0.25, fight_timing: 0.6,  complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.3  }, // Keeper of the Light
  68:  { farm_dependency: 0.15, fight_timing: 0.5,  complexity: 0.9,  game_length_affinity: 0.6,  mobility: 0.5  }, // Io
  69:  { farm_dependency: 0.5,  fight_timing: 0.6,  complexity: 0.8,  game_length_affinity: 0.6,  mobility: 0.3  }, // Visage
  70:  { farm_dependency: 0.65, fight_timing: 0.7,  complexity: 0.5,  game_length_affinity: 0.6,  mobility: 0.85 }, // Slark
  71:  { farm_dependency: 0.95, fight_timing: 0.15, complexity: 0.4,  game_length_affinity: 0.98, mobility: 0.1  }, // Medusa
  72:  { farm_dependency: 0.8,  fight_timing: 0.55, complexity: 0.4,  game_length_affinity: 0.7,  mobility: 0.4  }, // Troll Warlord
  73:  { farm_dependency: 0.45, fight_timing: 0.85, complexity: 0.3,  game_length_affinity: 0.5,  mobility: 0.5  }, // Centaur Warrunner
  74:  { farm_dependency: 0.5,  fight_timing: 0.75, complexity: 0.7,  game_length_affinity: 0.5,  mobility: 0.5  }, // Magnus
  75:  { farm_dependency: 0.5,  fight_timing: 0.85, complexity: 0.6,  game_length_affinity: 0.45, mobility: 0.7  }, // Timbersaw
  76:  { farm_dependency: 0.4,  fight_timing: 0.7,  complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.7  }, // Bounty Hunter
  77:  { farm_dependency: 0.3,  fight_timing: 0.85, complexity: 0.5,  game_length_affinity: 0.4,  mobility: 0.6  }, // Tusk
  78:  { farm_dependency: 0.3,  fight_timing: 0.8,  complexity: 0.5,  game_length_affinity: 0.4,  mobility: 0.3  }, // Skywrath Mage
  79:  { farm_dependency: 0.3,  fight_timing: 0.7,  complexity: 0.4,  game_length_affinity: 0.55, mobility: 0.3  }, // Abaddon
  103: { farm_dependency: 0.3,  fight_timing: 0.7,  complexity: 0.7,  game_length_affinity: 0.55, mobility: 0.2  }, // Elder Titan
  104: { farm_dependency: 0.6,  fight_timing: 0.9,  complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.4  }, // Legion Commander
  105: { farm_dependency: 0.3,  fight_timing: 0.4,  complexity: 0.8,  game_length_affinity: 0.65, mobility: 0.1  }, // Techies
  106: { farm_dependency: 0.6,  fight_timing: 0.75, complexity: 0.8,  game_length_affinity: 0.55, mobility: 0.95 }, // Ember Spirit
  107: { farm_dependency: 0.3,  fight_timing: 0.85, complexity: 0.9,  game_length_affinity: 0.4,  mobility: 0.8  }, // Earth Spirit
  108: { farm_dependency: 0.45, fight_timing: 0.65, complexity: 0.5,  game_length_affinity: 0.6,  mobility: 0.2  }, // Underlord
  109: { farm_dependency: 0.95, fight_timing: 0.2,  complexity: 0.5,  game_length_affinity: 0.95, mobility: 0.5  }, // Terrorblade
  110: { farm_dependency: 0.3,  fight_timing: 0.7,  complexity: 0.7,  game_length_affinity: 0.55, mobility: 0.6  }, // Phoenix
  111: { farm_dependency: 0.2,  fight_timing: 0.6,  complexity: 0.85, game_length_affinity: 0.55, mobility: 0.4  }, // Oracle
  112: { farm_dependency: 0.25, fight_timing: 0.6,  complexity: 0.7,  game_length_affinity: 0.6,  mobility: 0.4  }, // Winter Wyvern
  113: { farm_dependency: 0.85, fight_timing: 0.3,  complexity: 0.95, game_length_affinity: 0.85, mobility: 0.6  }, // Arc Warden
  114: { farm_dependency: 0.7,  fight_timing: 0.7,  complexity: 0.6,  game_length_affinity: 0.6,  mobility: 0.85 }, // Monkey King
  119: { farm_dependency: 0.3,  fight_timing: 0.75, complexity: 0.7,  game_length_affinity: 0.5,  mobility: 0.6  }, // Dark Willow
  120: { farm_dependency: 0.5,  fight_timing: 0.8,  complexity: 0.7,  game_length_affinity: 0.5,  mobility: 0.8  }, // Pangolier
  121: { farm_dependency: 0.25, fight_timing: 0.65, complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.2  }, // Grimstroke
  123: { farm_dependency: 0.4,  fight_timing: 0.65, complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.7  }, // Hoodwink
  126: { farm_dependency: 0.55, fight_timing: 0.8,  complexity: 0.7,  game_length_affinity: 0.5,  mobility: 0.9  }, // Void Spirit
  128: { farm_dependency: 0.3,  fight_timing: 0.7,  complexity: 0.6,  game_length_affinity: 0.5,  mobility: 0.4  }, // Snapfire
  129: { farm_dependency: 0.45, fight_timing: 0.85, complexity: 0.5,  game_length_affinity: 0.5,  mobility: 0.3  }, // Mars
  131: { farm_dependency: 0.3,  fight_timing: 0.65, complexity: 0.7,  game_length_affinity: 0.55, mobility: 0.4  }, // Ringmaster
  135: { farm_dependency: 0.5,  fight_timing: 0.85, complexity: 0.4,  game_length_affinity: 0.5,  mobility: 0.4  }, // Dawnbreaker
  136: { farm_dependency: 0.4,  fight_timing: 0.9,  complexity: 0.5,  game_length_affinity: 0.45, mobility: 0.7  }, // Marci
  137: { farm_dependency: 0.45, fight_timing: 0.9,  complexity: 0.4,  game_length_affinity: 0.45, mobility: 0.5  }, // Primal Beast
  138: { farm_dependency: 0.65, fight_timing: 0.55, complexity: 0.5,  game_length_affinity: 0.6,  mobility: 0.3  }, // Muerta
};

export function styleVector(heroId: number): number[] {
  const s = HERO_STYLES[heroId];
  if (!s) return [0.5, 0.5, 0.5, 0.5, 0.5];
  return [s.farm_dependency, s.fight_timing, s.complexity, s.game_length_affinity, s.mobility];
}

export function playerStyleVector(heroIds: number[], games: number[]): number[] {
  if (heroIds.length === 0) return [0.5, 0.5, 0.5, 0.5, 0.5];
  const totalGames = games.reduce((a, b) => a + b, 0);
  const weighted = [0, 0, 0, 0, 0];
  for (let i = 0; i < heroIds.length; i++) {
    const v = styleVector(heroIds[i]);
    const w = games[i] / totalGames;
    for (let d = 0; d < 5; d++) weighted[d] += v[d] * w;
  }
  return weighted;
}
