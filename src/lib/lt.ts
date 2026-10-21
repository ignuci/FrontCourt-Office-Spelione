/** Lithuanian wording helpers. */

/** Pick the right form: 1 klausimas, 2 klausimai, 10 klausimų, 21 klausimas… */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const d = n % 10;
  const t = n % 100;
  const word = d === 1 && t !== 11 ? one : d >= 2 && d <= 9 && (t < 12 || t > 19) ? few : many;
  return `${n} ${word}`;
}

/** e.g. "spalio 26 d., pirmadienis, 23:59" in the viewer's own time zone. */
export const fmtDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("lt-LT", { month: "long", day: "numeric", weekday: "long", hour: "2-digit", minute: "2-digit" });

/** The sheet script answers in English; show its known messages in Lithuanian. */
export function sheetMessage(msg: string): string {
  if (/locked/i.test(msg)) return "Etapas jau užrakintas – spėjimai nebepriimami.";
  if (/player list/i.test(msg)) return "Šio vardo nėra žaidėjų sąraše.";
  if (/unknown stage/i.test(msg)) return "Nežinomas etapas.";
  return msg;
}

/** Name in the vocative case, for addressing someone: Ignas → Ignai, Jurgis → Jurgi, Marius → Mariau. */
export function vocative(name: string): string {
  const rules: [RegExp, string][] = [
    [/ius$/, "iau"],
    [/as$/, "ai"],
    [/is$/, "i"],
    [/ys$/, "y"],
    [/us$/, "au"],
    [/ė$/, "e"],
  ];
  for (const [re, to] of rules) if (re.test(name)) return name.replace(re, to);
  return name;
}
