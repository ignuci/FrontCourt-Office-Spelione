import { TEAM_BY_AB } from "./teams.ts";
import type { AppData, Game, GamePick, Player, Prop } from "./types.ts";

export const APP_ID = "frontcourt-office-spelione";
export const DEFAULT_SEASON = "2026–27";
export const DEFAULT_LOCK = "2026-11-15";

export const newId = (): string => globalThis.crypto.randomUUID().slice(0, 8);

export function blankData(now = new Date()): AppData {
  const me: Player = { id: newId(), name: "Me" };
  return {
    app: APP_ID,
    version: 1,
    season: DEFAULT_SEASON,
    seasonLock: DEFAULT_LOCK,
    players: [me],
    activePlayer: me.id,
    games: [],
    gamePicks: {},
    seasonPicks: {},
    seasonResults: {},
    props: [],
    propPicks: {},
    updatedAt: now.toISOString(),
  };
}

export class InvalidFileError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Accepts anything parsed from a JSON file and returns clean AppData,
 * filling missing sections with defaults. Throws InvalidFileError if it
 * isn't one of our files.
 */
export function parseData(input: unknown): AppData {
  if (!isObj(input) || !Array.isArray(input.players) || input.players.length === 0) {
    throw new InvalidFileError("This isn't a FrontCourt Office predictions file.");
  }
  const base = blankData();
  const players = (input.players as unknown[])
    .filter(isObj)
    .map((p) => ({ id: String(p.id ?? newId()), name: String(p.name ?? "Player") }));
  if (players.length === 0) throw new InvalidFileError("The file has no players.");

  const games: Game[] = Array.isArray(input.games)
    ? (input.games as unknown[]).filter(isObj).flatMap((g) => {
        const when = new Date(String(g.when));
        if (!g.id || !g.away || !g.home || isNaN(when.getTime())) return [];
        const r = isObj(g.result) ? g.result : null;
        return [{
          id: String(g.id),
          when: when.toISOString(),
          away: String(g.away),
          home: String(g.home),
          result: r && Number.isFinite(Number(r.away)) && Number.isFinite(Number(r.home))
            ? { away: Number(r.away), home: Number(r.home), winner: String(r.winner) }
            : null,
        }];
      })
    : [];

  const props: Prop[] = Array.isArray(input.props)
    ? (input.props as unknown[]).filter(isObj).flatMap((p) => {
        const options = Array.isArray(p.options) ? p.options.map(String) : [];
        if (!p.id || !p.q || options.length < 2) return [];
        return [{
          id: String(p.id),
          q: String(p.q),
          options,
          deadline: typeof p.deadline === "string" && p.deadline ? p.deadline : null,
          pts: Math.max(0, Number(p.pts) || 0),
          answer: typeof p.answer === "string" && options.includes(p.answer) ? p.answer : null,
        }];
      })
    : [];

  const nested = <T>(v: unknown, clean: (x: unknown) => T | undefined): Record<string, Record<string, T>> => {
    const out: Record<string, Record<string, T>> = {};
    if (!isObj(v)) return out;
    for (const [pid, picks] of Object.entries(v)) {
      if (!isObj(picks)) continue;
      out[pid] = {};
      for (const [k, x] of Object.entries(picks)) {
        const c = clean(x);
        if (c !== undefined) out[pid][k] = c;
      }
    }
    return out;
  };
  const cleanStr = (x: unknown) => (typeof x === "string" && x.trim() ? x : undefined);
  const cleanPick = (x: unknown): GamePick | undefined => {
    if (!isObj(x)) return undefined;
    const margin = x.margin == null || x.margin === "" ? null : Number(x.margin);
    return {
      winner: typeof x.winner === "string" && x.winner ? x.winner : null,
      margin: margin != null && Number.isFinite(margin) && margin > 0 ? Math.round(margin) : null,
    };
  };

  const seasonResults: Record<string, string> = {};
  if (isObj(input.seasonResults)) {
    for (const [k, v] of Object.entries(input.seasonResults)) {
      const c = cleanStr(v);
      if (c) seasonResults[k] = c;
    }
  }

  const activePlayer = players.some((p) => p.id === input.activePlayer) ? String(input.activePlayer) : players[0].id;

  return {
    ...base,
    season: typeof input.season === "string" && input.season.trim() ? input.season : base.season,
    seasonLock: typeof input.seasonLock === "string" ? input.seasonLock : base.seasonLock,
    players,
    activePlayer,
    games,
    gamePicks: nested(input.gamePicks, cleanPick),
    seasonPicks: nested(input.seasonPicks, cleanStr),
    seasonResults,
    props,
    propPicks: nested(input.propPicks, cleanStr),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : base.updatedAt,
  };
}

export const serialize = (data: AppData): string => JSON.stringify(data, null, 2) + "\n";

/* ---------- locks ---------- */

const endOfDay = (ymd: string): Date => new Date(`${ymd}T23:59:59`);

export const isGameLocked = (g: Game, now = new Date()): boolean => new Date(g.when) <= now;
export const isSeasonLocked = (d: AppData, now = new Date()): boolean => !!d.seasonLock && endOfDay(d.seasonLock) < now;
export const isPropLocked = (p: Prop, now = new Date()): boolean => !!p.deadline && endOfDay(p.deadline) < now;

/* ---------- updates (all return a new object; never mutate) ---------- */

export class ActionError extends Error {}

export function addGame(d: AppData, g: { when: string; away: string; home: string }): AppData {
  if (!TEAM_BY_AB[g.away] || !TEAM_BY_AB[g.home]) throw new ActionError("Pick both teams.");
  if (g.away === g.home) throw new ActionError("A team can't play itself.");
  const when = new Date(g.when);
  if (isNaN(when.getTime())) throw new ActionError("Pick a tip-off time.");
  const game: Game = { id: newId(), when: when.toISOString(), away: g.away, home: g.home, result: null };
  return { ...d, games: [...d.games, game] };
}

export function removeGame(d: AppData, gameId: string): AppData {
  const gamePicks = Object.fromEntries(
    Object.entries(d.gamePicks).map(([pid, picks]) => {
      const { [gameId]: _drop, ...rest } = picks;
      return [pid, rest];
    }),
  );
  return { ...d, games: d.games.filter((g) => g.id !== gameId), gamePicks };
}

/** Toggle a winner pick (picking the same team again clears it). No-op once the game has tipped off. */
export function pickWinner(d: AppData, playerId: string, gameId: string, team: string, now = new Date()): AppData {
  const g = d.games.find((x) => x.id === gameId);
  if (!g || isGameLocked(g, now) || (team !== g.away && team !== g.home)) return d;
  const cur = d.gamePicks[playerId]?.[gameId] ?? { winner: null, margin: null };
  const next: GamePick = { ...cur, winner: cur.winner === team ? null : team };
  return { ...d, gamePicks: { ...d.gamePicks, [playerId]: { ...d.gamePicks[playerId], [gameId]: next } } };
}

export function setMargin(d: AppData, playerId: string, gameId: string, margin: number | null, now = new Date()): AppData {
  const g = d.games.find((x) => x.id === gameId);
  if (!g || isGameLocked(g, now)) return d;
  const clean = margin == null || !Number.isFinite(margin) || margin <= 0 ? null : Math.round(margin);
  const cur = d.gamePicks[playerId]?.[gameId] ?? { winner: null, margin: null };
  return { ...d, gamePicks: { ...d.gamePicks, [playerId]: { ...d.gamePicks[playerId], [gameId]: { ...cur, margin: clean } } } };
}

/** Record a final score (or pass null to clear it). Ties aren't possible in the NBA, so they're rejected. */
export function setResult(d: AppData, gameId: string, score: { away: number; home: number } | null): AppData {
  const games = d.games.map((g) => {
    if (g.id !== gameId) return g;
    if (!score) return { ...g, result: null };
    if (!Number.isFinite(score.away) || !Number.isFinite(score.home) || score.away < 0 || score.home < 0) {
      throw new ActionError("Scores must be positive numbers.");
    }
    if (score.away === score.home) throw new ActionError("NBA games can't end in a tie.");
    return { ...g, result: { ...score, winner: score.away > score.home ? g.away : g.home } };
  });
  return { ...d, games };
}

export function setSeasonPick(d: AppData, playerId: string, qid: string, value: string, now = new Date()): AppData {
  if (isSeasonLocked(d, now)) return d;
  const mine = { ...d.seasonPicks[playerId] };
  if (value.trim()) mine[qid] = value.trim();
  else delete mine[qid];
  return { ...d, seasonPicks: { ...d.seasonPicks, [playerId]: mine } };
}

export function setSeasonResult(d: AppData, qid: string, value: string): AppData {
  const seasonResults = { ...d.seasonResults };
  if (value.trim()) seasonResults[qid] = value.trim();
  else delete seasonResults[qid];
  return { ...d, seasonResults };
}

export function addProp(d: AppData, p: { q: string; options: string[]; deadline: string | null; pts: number }): AppData {
  const q = p.q.trim();
  const seen = new Set<string>();
  const options = p.options
    .map((o) => o.trim())
    .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()));
  if (!q) throw new ActionError("Write the question first.");
  if (options.length < 2) throw new ActionError("Give at least two answers.");
  const prop: Prop = { id: newId(), q, options, deadline: p.deadline || null, pts: Math.max(1, Math.round(p.pts) || 1), answer: null };
  return { ...d, props: [prop, ...d.props] };
}

export function removeProp(d: AppData, propId: string): AppData {
  const propPicks = Object.fromEntries(
    Object.entries(d.propPicks).map(([pid, picks]) => {
      const { [propId]: _drop, ...rest } = picks;
      return [pid, rest];
    }),
  );
  return { ...d, props: d.props.filter((p) => p.id !== propId), propPicks };
}

/** Toggle an answer on a prop. No-op once it is locked or decided. */
export function pickProp(d: AppData, playerId: string, propId: string, option: string, now = new Date()): AppData {
  const p = d.props.find((x) => x.id === propId);
  if (!p || p.answer != null || isPropLocked(p, now) || !p.options.includes(option)) return d;
  const mine = { ...d.propPicks[playerId] };
  if (mine[propId] === option) delete mine[propId];
  else mine[propId] = option;
  return { ...d, propPicks: { ...d.propPicks, [playerId]: mine } };
}

export function setPropAnswer(d: AppData, propId: string, answer: string | null): AppData {
  return {
    ...d,
    props: d.props.map((p) => (p.id === propId ? { ...p, answer: answer && p.options.includes(answer) ? answer : null } : p)),
  };
}

export function addPlayer(d: AppData, name: string): AppData {
  const n = name.trim();
  if (!n) throw new ActionError("Enter a name.");
  if (d.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) throw new ActionError(`${n} is already playing.`);
  return { ...d, players: [...d.players, { id: newId(), name: n }] };
}

export function removePlayer(d: AppData, playerId: string): AppData {
  if (d.players.length <= 1) throw new ActionError("Keep at least one player.");
  const players = d.players.filter((p) => p.id !== playerId);
  const drop = <T>(rec: Record<string, T>) => {
    const { [playerId]: _drop, ...rest } = rec;
    return rest;
  };
  return {
    ...d,
    players,
    activePlayer: d.activePlayer === playerId ? players[0].id : d.activePlayer,
    gamePicks: drop(d.gamePicks),
    seasonPicks: drop(d.seasonPicks),
    propPicks: drop(d.propPicks),
  };
}

export const setActivePlayer = (d: AppData, playerId: string): AppData =>
  d.players.some((p) => p.id === playerId) ? { ...d, activePlayer: playerId } : d;
