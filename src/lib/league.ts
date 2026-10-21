/**
 * The league: players, the four stages and their questions. All of it comes
 * from public/league.json, which is edited by hand (names, questions, lock
 * dates, correct answers). Submissions come from the Google Sheet.
 */
import { normalize } from "./scoring.ts";
import { TEAM_BY_AB } from "./teams.ts";
import type { Conference } from "./types.ts";

export type QuestionType = "team" | "choice" | "text" | "number";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  /** For "choice": the answers to choose from. */
  options?: string[];
  /** For "team": limit the list to one conference. */
  conf?: Conference;
  /** For "number": how far off still counts as right (default 0). */
  tolerance?: number;
  /** The correct answer, once known. For "text" this can list accepted spellings. */
  answer: string | string[] | null;
}

export interface Stage {
  id: string;
  name: string;
  /** ISO timestamp. Submissions close at this moment and answers become visible. */
  lock: string;
  /** Optional ISO timestamp before which the stage isn't open yet. */
  opens?: string;
  note?: string;
  questions: Question[];
}

export interface League {
  season: string;
  /** Google Apps Script web app URL that stores submissions. Empty = saving not set up yet. */
  sheetUrl: string;
  players: string[];
  stages: Stage[];
}

export type Answers = Record<string, string>;

export interface Submission {
  player: string;
  stage: string;
  submittedAt: string;
  /** null while the stage is still open — the sheet hides other people's answers until lock. */
  answers: Answers | null;
}

export const QUESTIONS_PER_STAGE = 12;

/* ---------- validation (run by tests so a bad edit never reaches the site) ---------- */

export function validateLeague(l: League): string[] {
  const errors: string[] = [];
  if (!l.players.length) errors.push("No players.");
  const names = new Set<string>();
  for (const p of l.players) {
    if (!p.trim()) errors.push("Empty player name.");
    if (names.has(normalize(p))) errors.push(`Duplicate player: ${p}`);
    names.add(normalize(p));
  }
  const ids = new Set<string>();
  for (const s of l.stages) {
    if (isNaN(Date.parse(s.lock))) errors.push(`${s.name}: lock date is not a valid date.`);
    if (s.opens && isNaN(Date.parse(s.opens))) errors.push(`${s.name}: opens date is not a valid date.`);
    if (s.questions.length && s.questions.length !== QUESTIONS_PER_STAGE) {
      errors.push(`${s.name}: has ${s.questions.length} questions, expected ${QUESTIONS_PER_STAGE}.`);
    }
    for (const q of s.questions) {
      const where = `${s.name} / ${q.id}`;
      if (ids.has(q.id)) errors.push(`${where}: duplicate question id.`);
      ids.add(q.id);
      if (!q.text.trim()) errors.push(`${where}: no question text.`);
      if (!(q.points > 0)) errors.push(`${where}: points must be more than 0.`);
      if (q.type === "choice" && (!q.options || q.options.length < 2)) errors.push(`${where}: needs at least two options.`);
      if (q.answer == null) continue;
      const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
      for (const a of answers) {
        if (q.type === "team" && !TEAM_BY_AB[a]) errors.push(`${where}: answer "${a}" is not a team code.`);
        if (q.type === "choice" && !q.options?.includes(a)) errors.push(`${where}: answer "${a}" is not one of the options.`);
        if (q.type === "number" && !Number.isFinite(Number(a))) errors.push(`${where}: answer "${a}" is not a number.`);
      }
    }
  }
  return errors;
}

/* ---------- stage status ---------- */

export type StageStatus = "soon" | "open" | "locked";

export function stageStatus(s: Stage, now = new Date()): StageStatus {
  if (new Date(s.lock) <= now) return "locked";
  if (!s.questions.length || (s.opens && new Date(s.opens) > now)) return "soon";
  return "open";
}

/* ---------- scoring ---------- */

/** true / false once the correct answer is known, null while it isn't. */
export function isCorrect(q: Question, given: string | undefined): boolean | null {
  if (q.answer == null) return null;
  if (given == null || given.trim() === "") return false;
  const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
  switch (q.type) {
    case "number": {
      const n = Number(given);
      return Number.isFinite(n) && answers.some((a) => Math.abs(Number(a) - n) <= (q.tolerance ?? 0));
    }
    case "text":
      return answers.some((a) => normalize(a) === normalize(given));
    default:
      return answers.includes(given);
  }
}

export function scoreAnswers(stage: Stage, answers: Answers | null): number {
  if (!answers) return 0;
  return stage.questions.reduce((sum, q) => sum + (isCorrect(q, answers[q.id]) ? q.points : 0), 0);
}

export const maxPoints = (stage: Stage): number => stage.questions.reduce((s, q) => s + q.points, 0);

export interface StandingRow {
  player: string;
  total: number;
  byStage: Record<string, number | null>; // null = didn't submit
  rank: number;
}

/** Leaderboard across all stages, for exactly the players listed in league.json. */
export function standings(league: League, submissions: Submission[]): StandingRow[] {
  const rows = league.players.map((player) => {
    const byStage: Record<string, number | null> = {};
    let total = 0;
    for (const s of league.stages) {
      const sub = submissions.find((x) => x.player === player && x.stage === s.id);
      byStage[s.id] = sub ? scoreAnswers(s, sub.answers) : null;
      total += byStage[s.id] ?? 0;
    }
    return { player, total, byStage, rank: 0 };
  });
  rows.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
  rows.forEach((r, i) => (r.rank = i > 0 && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1));
  return rows;
}

/** How many of a stage's questions have an answer filled in. */
export const answeredCount = (stage: Stage, answers: Answers): number =>
  stage.questions.filter((q) => (answers[q.id] ?? "").trim() !== "").length;

/** Display text for an answer (team codes become team names). */
export function formatAnswer(q: Question, value: string | undefined): string {
  if (value == null || value === "") return "—";
  if (q.type === "team") {
    const t = TEAM_BY_AB[value];
    return t ? `${t.city} ${t.name}` : value;
  }
  return value;
}
