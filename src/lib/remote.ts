/** Talks to the Google Apps Script web app that stores submissions in the sheet. */
import type { Answers, Submission } from "./league.ts";
import { sheetMessage } from "./lt.ts";

/**
 * `retry` = worth trying again later (bad connection, server hiccup).
 * Otherwise the sheet gave a clear "no" (stage locked, unknown name).
 */
export class SaveError extends Error {
  retry: boolean;
  constructor(message: string, retry: boolean) {
    super(message);
    this.retry = retry;
  }
}

async function call(input: URL | string, init?: RequestInit): Promise<Record<string, unknown>> {
  let r: Response;
  try {
    r = await fetch(input, init);
  } catch {
    throw new SaveError("Nėra ryšio su spėjimų saugykla.", true);
  }
  if (!r.ok) throw new SaveError(`Spėjimų saugykla atsakė klaida (${r.status}).`, true);
  try {
    return (await r.json()) as Record<string, unknown>;
  } catch {
    throw new SaveError("Spėjimų saugykla atsakė neaiškiai.", true);
  }
}

export async function fetchSubmissions(sheetUrl: string, player: string | null): Promise<Submission[]> {
  const url = new URL(sheetUrl);
  if (player) url.searchParams.set("player", player);
  url.searchParams.set("t", String(Date.now()));
  const body = await call(url, { cache: "no-store" });
  if (!body.ok || !Array.isArray(body.submissions)) throw new SaveError(sheetMessage(String(body.error ?? "Nepavyko gauti spėjimų.")), true);
  return body.submissions as Submission[];
}

/**
 * Send a final submission. Safe to retry: if the sheet already has this
 * player's answers for the stage, it returns those instead of adding a row.
 */
export async function submitAnswers(sheetUrl: string, player: string, stage: string, answers: Answers): Promise<Submission> {
  // text/plain keeps this a "simple" request, which Apps Script accepts from any site.
  const body = await call(sheetUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ player, stage, answers }),
  });
  if (!body.ok || !body.submission) throw new SaveError(sheetMessage(String(body.error ?? "Išsaugojimas nepatvirtintas.")), false);
  return body.submission as Submission;
}
