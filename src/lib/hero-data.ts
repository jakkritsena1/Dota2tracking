// Static hero name / shortname mapping.
// Source: https://api.opendota.com/api/heroes — kept as a small static file
// to avoid runtime API dependency on hero metadata.
// Update periodically as new heroes are added.

export const HEROES: Record<number, { displayName: string; shortName: string }> = {
  1:   { displayName: "Anti-Mage",       shortName: "antimage" },
  2:   { displayName: "Axe",             shortName: "axe" },
  3:   { displayName: "Bane",            shortName: "bane" },
  4:   { displayName: "Bloodseeker",     shortName: "bloodseeker" },
  5:   { displayName: "Crystal Maiden",  shortName: "crystal_maiden" },
  6:   { displayName: "Drow Ranger",     shortName: "drow_ranger" },
  7:   { displayName: "Earthshaker",     shortName: "earthshaker" },
  8:   { displayName: "Juggernaut",      shortName: "juggernaut" },
  9:   { displayName: "Mirana",          shortName: "mirana" },
  10:  { displayName: "Morphling",       shortName: "morphling" },
  11:  { displayName: "Shadow Fiend",    shortName: "nevermore" },
  12:  { displayName: "Phantom Lancer",  shortName: "phantom_lancer" },
  13:  { displayName: "Puck",            shortName: "puck" },
  14:  { displayName: "Pudge",           shortName: "pudge" },
  15:  { displayName: "Razor",           shortName: "razor" },
  16:  { displayName: "Sand King",       shortName: "sand_king" },
  17:  { displayName: "Storm Spirit",    shortName: "storm_spirit" },
  18:  { displayName: "Sven",            shortName: "sven" },
  19:  { displayName: "Tiny",            shortName: "tiny" },
  20:  { displayName: "Vengeful Spirit", shortName: "vengefulspirit" },
  21:  { displayName: "Windranger",      shortName: "windrunner" },
  22:  { displayName: "Zeus",            shortName: "zuus" },
  23:  { displayName: "Kunkka",          shortName: "kunkka" },
  25:  { displayName: "Lina",            shortName: "lina" },
  26:  { displayName: "Lion",            shortName: "lion" },
  27:  { displayName: "Shadow Shaman",   shortName: "shadow_shaman" },
  28:  { displayName: "Slardar",         shortName: "slardar" },
  29:  { displayName: "Tidehunter",      shortName: "tidehunter" },
  30:  { displayName: "Witch Doctor",    shortName: "witch_doctor" },
  31:  { displayName: "Lich",            shortName: "lich" },
  32:  { displayName: "Riki",            shortName: "riki" },
  33:  { displayName: "Enigma",          shortName: "enigma" },
  34:  { displayName: "Tinker",          shortName: "tinker" },
  35:  { displayName: "Sniper",          shortName: "sniper" },
  36:  { displayName: "Necrophos",       shortName: "necrolyte" },
  37:  { displayName: "Warlock",         shortName: "warlock" },
  38:  { displayName: "Beastmaster",     shortName: "beastmaster" },
  39:  { displayName: "Queen of Pain",   shortName: "queenofpain" },
  40:  { displayName: "Venomancer",      shortName: "venomancer" },
  41:  { displayName: "Faceless Void",   shortName: "faceless_void" },
  42:  { displayName: "Wraith King",     shortName: "skeleton_king" },
  43:  { displayName: "Death Prophet",   shortName: "death_prophet" },
  44:  { displayName: "Phantom Assassin",shortName: "phantom_assassin" },
  45:  { displayName: "Pugna",           shortName: "pugna" },
  46:  { displayName: "Templar Assassin",shortName: "templar_assassin" },
  47:  { displayName: "Viper",           shortName: "viper" },
  48:  { displayName: "Luna",            shortName: "luna" },
  49:  { displayName: "Dragon Knight",   shortName: "dragon_knight" },
  50:  { displayName: "Dazzle",          shortName: "dazzle" },
  51:  { displayName: "Clockwerk",       shortName: "rattletrap" },
  52:  { displayName: "Leshrac",         shortName: "leshrac" },
  53:  { displayName: "Nature's Prophet",shortName: "furion" },
  54:  { displayName: "Lifestealer",     shortName: "life_stealer" },
  55:  { displayName: "Dark Seer",       shortName: "dark_seer" },
  56:  { displayName: "Clinkz",          shortName: "clinkz" },
  57:  { displayName: "Omniknight",      shortName: "omniknight" },
  58:  { displayName: "Chaos Knight",    shortName: "chaos_knight" },
  59:  { displayName: "Meepo",           shortName: "meepo" },
  60:  { displayName: "Treant Protector",shortName: "treant" },
  61:  { displayName: "Ogre Magi",       shortName: "ogre_magi" },
  62:  { displayName: "Undying",         shortName: "undying" },
  63:  { displayName: "Rubick",          shortName: "rubick" },
  64:  { displayName: "Disruptor",       shortName: "disruptor" },
  65:  { displayName: "Nyx Assassin",    shortName: "nyx_assassin" },
  66:  { displayName: "Naga Siren",      shortName: "naga_siren" },
  67:  { displayName: "Keeper of the Light", shortName: "keeper_of_the_light" },
  68:  { displayName: "Io",              shortName: "wisp" },
  69:  { displayName: "Visage",          shortName: "visage" },
  70:  { displayName: "Slark",           shortName: "slark" },
  71:  { displayName: "Medusa",          shortName: "medusa" },
  72:  { displayName: "Troll Warlord",   shortName: "troll_warlord" },
  73:  { displayName: "Centaur Warrunner",shortName: "centaur" },
  74:  { displayName: "Magnus",          shortName: "magnataur" },
  75:  { displayName: "Timbersaw",       shortName: "shredder" },
  76:  { displayName: "Bounty Hunter",   shortName: "bounty_hunter" },
  77:  { displayName: "Tusk",            shortName: "tusk" },
  78:  { displayName: "Skywrath Mage",   shortName: "skywrath_mage" },
  79:  { displayName: "Abaddon",         shortName: "abaddon" },
  80:  { displayName: "Elder Titan",     shortName: "elder_titan" },
  81:  { displayName: "Legion Commander",shortName: "legion_commander" },
  82:  { displayName: "Techies",         shortName: "techies" },
  83:  { displayName: "Ember Spirit",    shortName: "ember_spirit" },
  84:  { displayName: "Earth Spirit",    shortName: "earth_spirit" },
  85:  { displayName: "Underlord",       shortName: "abyssal_underlord" },
  86:  { displayName: "Terrorblade",     shortName: "terrorblade" },
  87:  { displayName: "Phoenix",         shortName: "phoenix" },
  88:  { displayName: "Oracle",          shortName: "oracle" },
  89:  { displayName: "Winter Wyvern",   shortName: "winter_wyvern" },
  90:  { displayName: "Arc Warden",      shortName: "arc_warden" },
  91:  { displayName: "Monkey King",     shortName: "monkey_king" },
  92:  { displayName: "Dark Willow",     shortName: "dark_willow" },
  93:  { displayName: "Pangolier",       shortName: "pangolier" },
  94:  { displayName: "Grimstroke",      shortName: "grimstroke" },
  95:  { displayName: "Hoodwink",        shortName: "hoodwink" },
  96:  { displayName: "Void Spirit",     shortName: "void_spirit" },
  97:  { displayName: "Snapfire",        shortName: "snapfire" },
  98:  { displayName: "Mars",            shortName: "mars" },
  99:  { displayName: "Dawnbreaker",     shortName: "dawnbreaker" },
  100: { displayName: "Marci",           shortName: "marci" },
  101: { displayName: "Primal Beast",    shortName: "primal_beast" },
  102: { displayName: "Muerta",          shortName: "muerta" },
  104: { displayName: "Ringmaster",      shortName: "ringmaster" },
};

export function getHeroName(heroId: number): string {
  return HEROES[heroId]?.displayName ?? `Hero #${heroId}`;
}

export function getHeroShortName(heroId: number): string {
  return HEROES[heroId]?.shortName ?? `hero_${heroId}`;
}

export function heroIconUrl(heroId: number): string {
  const shortName = getHeroShortName(heroId);
  return `https://cdn.stratz.com/images/dota2/heroes/${shortName}_icon.png`;
}

export function heroBannerUrl(heroId: number): string {
  const shortName = getHeroShortName(heroId);
  return `https://cdn.stratz.com/images/dota2/heroes/${shortName}_vert.png`;
}
