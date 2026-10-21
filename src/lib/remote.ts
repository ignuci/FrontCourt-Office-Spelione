/** Talks to the Google Apps Script web app that stores submissions in the sheet. */
import type { Answers, Submission } from "./league.ts";

export class SaveError extends Error {}

export async function fetchSubmissions(sheetUrl: string, player: string | null): Promise<Submission[]> {
  const url = new URL(sheetUrl);
  if (player) url.searchParams.set("player", player);
  url.searchParams.set("t", String(Date.now()));
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new SaveError(`The answer sheet replied ${r.status}.`);
  const body = (await r.json()) as { ok: boolean; submissions?: Submission[]; error?: string };
  if (!body.ok || !body.submissions) throw new SaveError(body.error ?? "The answer sheet sent something unexpected.");
  return body.submissions;
}

/**
 * Send a final submission. Safe to retry: if the sheet already has this
 * player's answers for the stage, it returns those instead of adding a row.
 */
export async function submitAnswers(sheetUrl: string, player: string, stage: string, answers: Answers): Promise<Submission> {
  // text/plain keeps this a "simple" request, which Apps Script accepts from any site.
  const r = await fetch(sheetUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ player, stage, answers }),
  });
  if (!r.ok) throw new SaveError(`The answer sheet replied ${r.status}.`);
  const body = (await r.json()) as { ok: boolean; submission?: Submission; error?: string };
  if (!body.ok || !body.submission) throw new SaveError(body.error ?? "The answer sheet didn't confirm the save.");
  return body.submission;
}
