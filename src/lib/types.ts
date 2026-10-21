export type Conference = "E" | "W";

export interface Team {
  ab: string;
  city: string;
  name: string;
  conf: Conference;
}

export interface Player {
  id: string;
  name: string;
}

export interface GameResult {
  away: number;
  home: number;
  winner: string;
}

export interface Game {
  id: string;
  /** Tip-off as an ISO timestamp. Picks lock at this moment. */
  when: string;
  away: string;
  home: string;
  result: GameResult | null;
}

export interface GamePick {
  winner: string | null;
  margin: number | null;
}

export interface Prop {
  id: string;
  q: string;
  options: string[];
  /** YYYY-MM-DD; picks lock at the end of this day. */
  deadline: string | null;
  pts: number;
  answer: string | null;
}

export type SeasonQuestionType = "team" | "text";

export interface SeasonQuestion {
  id: string;
  label: string;
  type: SeasonQuestionType;
  pts: number;
  conf?: Conference;
}

/** Everything the app stores. This is exactly what goes into the JSON file. */
export interface AppData {
  app: "frontcourt-office-spelione";
  version: 1;
  season: string;
  /** YYYY-MM-DD; season picks lock at the end of this day. */
  seasonLock: string;
  players: Player[];
  activePlayer: string;
  games: Game[];
  gamePicks: Record<string, Record<string, GamePick>>;
  seasonPicks: Record<string, Record<string, string>>;
  seasonResults: Record<string, string>;
  props: Prop[];
  propPicks: Record<string, Record<string, string>>;
  updatedAt: string;
}

export interface Score {
  total: number;
  games: number;
  gameCorrect: number;
  gameGraded: number;
  season: number;
  props: number;
  pending: number;
}
