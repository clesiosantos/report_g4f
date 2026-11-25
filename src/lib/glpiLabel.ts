// GLPI pode armazenar nomes com entidades HTML. Decodificar somente na
// apresentacao, sem alterar snapshots, hashes ou interpretar HTML como markup.
const entities: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0',
};

export function decodeGlpiLabel(value: string | null | undefined): string {
  return (value ?? '').replace(/&(#(?:[0-9]+|x[0-9a-f]+)|amp|quot|apos|lt|gt|nbsp);/gi, (match, token: string) => {
    const key = token.toLowerCase();
    if (!key.startsWith('#')) return entities[key] ?? match;
    const n = key.startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number(key.slice(1));
    if (!Number.isInteger(n) || n <= 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return match;
    return String.fromCodePoint(n);
  });
}
