/** Text helpers for comparing typed answers, mostly player names. */

/** Lower case, no accents, single spaces ("  Nikola JOKIĆ " → "nikola jokic"). */
export const normalize = (s: string | null | undefined): string =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);

/** For names: also ignore punctuation and Jr./Sr./III ("Ja'Kobi Gillespie Jr." → "jakobi gillespie"). */
export function simplifyName(s: string | null | undefined): string {
  return normalize(s)
    .replace(/['’`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !SUFFIXES.has(w))
    .join(" ");
}

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

/**
 * Do two typed names mean the same person? Ignores case, accents, punctuation
 * and Jr./Sr., and forgives small typos: 1 letter for short names, 2 for names
 * of 10+ letters ("Shai Gilgeous Alexandr" still matches).
 */
export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = simplifyName(a);
  const y = simplifyName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const allowed = Math.max(x.length, y.length) >= 10 ? 2 : 1;
  return Math.abs(x.length - y.length) <= allowed && editDistance(x, y) <= allowed;
}

/** Options that match what's typed so far: names starting with it first, then names containing it. */
export function suggest(options: string[], typed: string, limit = 8): string[] {
  const t = simplifyName(typed);
  if (!t) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const o of options) {
    const s = simplifyName(o);
    if (s.startsWith(t) || s.split(" ").some((w) => w.startsWith(t))) starts.push(o);
    else if (s.includes(t)) contains.push(o);
  }
  return [...starts, ...contains].slice(0, limit);
}
