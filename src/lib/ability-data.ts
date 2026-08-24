// Ability icon URL helper. Unlike hero-data.ts / item-data.ts, no static
// name map is needed here — the live STRATZ match query already resolves
// each ability's internal shortname and localized display name, so this
// just builds the CDN URL from that shortname (verified via HEAD request).

export function abilityIconUrl(shortName: string): string {
  return `https://cdn.stratz.com/images/dota2/abilities/${shortName}.png`;
}
