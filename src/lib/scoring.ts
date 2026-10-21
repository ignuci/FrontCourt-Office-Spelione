import { SEASON_QUESTIONS } from "./teams.ts";
import type { AppData, Player, Score } from "./types.ts";

/** Points for a correct game winner, and the bonus for a close margin guess. */
export const GAME_POINTS = 1;
export const MARGIN_BONUS = 1;
export const MARGIN_TOLERANCE = 3;

/** Compare free-text answers ignoring case, accents and extra spaces ("Jokić" === "jokic"). */
export const normalize = (s: string | null | undefined): string =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

export const answersMatch = (a: string | null | undefined, b: string | null | undefined): boolean =>
  normalize(a) !== "" && normalize(a) === normalize(b);

export function scorePlayer(data: AppData, playerId: string): Score {
  const r: Score = { total: 0, games: 0, gameCorrect: 0, gameGraded: 0, season: 0, props: 0, pending: 0 };

  for (const g of data.games) {
    const pick = data.gamePicks[playerId]?.[g.id];
    if (!pick?.winner) continue;
    if (!g.result) {
      r.pending++;
      continue;
    }
    r.gameGraded++;
    if (pick.winner === g.result.winner) {
      r.gameCorrect++;
      r.games += GAME_POINTS;
      const margin = Math.abs(g.result.home - g.result.away);
      if (pick.margin != null && Math.abs(pick.margin - margin) <= MARGIN_TOLERANCE) r.games += MARGIN_BONUS;
    }
  }

  for (const q of SEASON_QUESTIONS) {
    if (answersMatch(data.seasonResults[q.id], data.seasonPicks[playerId]?.[q.id])) r.season += q.pts;
  }

  for (const p of data.props) {
    if (p.answer != null && answersMatch(p.answer, data.propPicks[playerId]?.[p.id])) r.props += p.pts;
  }

  r.total = r.games + r.season + r.props;
  return r;
}

export type RankedPlayer = Player & Score & { rank: number };

/** Players sorted by points; ties share a rank and are broken for display by correct game picks. */
export function leaderboard(data: AppData): RankedPlayer[] {
  const rows = data.players
    .map((p) => ({ ...p, ...scorePlayer(data, p.id) }))
    .sort((a, b) => b.total - a.total || b.gameCorrect - a.gameCorrect || a.name.localeCompare(b.name));
  let rank = 0;
  return rows.map((row, i) => {
    if (i === 0 || row.total !== rows[i - 1].total) rank = i + 1;
    return { ...row, rank };
  });
}
