import type { Conference, SeasonQuestion, Team } from "./types.ts";

const RAW: [string, string, string, Conference][] = [
  ["ATL", "Atlanta", "Hawks", "E"], ["BOS", "Boston", "Celtics", "E"], ["BKN", "Brooklyn", "Nets", "E"],
  ["CHA", "Charlotte", "Hornets", "E"], ["CHI", "Chicago", "Bulls", "E"], ["CLE", "Cleveland", "Cavaliers", "E"],
  ["DAL", "Dallas", "Mavericks", "W"], ["DEN", "Denver", "Nuggets", "W"], ["DET", "Detroit", "Pistons", "E"],
  ["GSW", "Golden State", "Warriors", "W"], ["HOU", "Houston", "Rockets", "W"], ["IND", "Indiana", "Pacers", "E"],
  ["LAC", "LA", "Clippers", "W"], ["LAL", "Los Angeles", "Lakers", "W"], ["MEM", "Memphis", "Grizzlies", "W"],
  ["MIA", "Miami", "Heat", "E"], ["MIL", "Milwaukee", "Bucks", "E"], ["MIN", "Minnesota", "Timberwolves", "W"],
  ["NOP", "New Orleans", "Pelicans", "W"], ["NYK", "New York", "Knicks", "E"], ["OKC", "Oklahoma City", "Thunder", "W"],
  ["ORL", "Orlando", "Magic", "E"], ["PHI", "Philadelphia", "76ers", "E"], ["PHX", "Phoenix", "Suns", "W"],
  ["POR", "Portland", "Trail Blazers", "W"], ["SAC", "Sacramento", "Kings", "W"], ["SAS", "San Antonio", "Spurs", "W"],
  ["TOR", "Toronto", "Raptors", "E"], ["UTA", "Utah", "Jazz", "W"], ["WAS", "Washington", "Wizards", "E"],
];

export const TEAMS: Team[] = RAW.map(([ab, city, name, conf]) => ({ ab, city, name, conf }));
export const TEAM_BY_AB: Record<string, Team> = Object.fromEntries(TEAMS.map((t) => [t.ab, t]));

export const teamName = (ab: string): string => {
  const t = TEAM_BY_AB[ab];
  return t ? `${t.city} ${t.name}` : ab;
};

export const SEASON_QUESTIONS: SeasonQuestion[] = [
  { id: "champ", label: "NBA Champion", type: "team", pts: 20 },
  { id: "finalsLoser", label: "Finals runner-up", type: "team", pts: 10 },
  { id: "east1", label: "East #1 seed", type: "team", conf: "E", pts: 8 },
  { id: "west1", label: "West #1 seed", type: "team", conf: "W", pts: 8 },
  { id: "worst", label: "Worst record", type: "team", pts: 6 },
  { id: "mvp", label: "MVP", type: "text", pts: 12 },
  { id: "roy", label: "Rookie of the Year", type: "text", pts: 8 },
  { id: "dpoy", label: "Defensive Player of the Year", type: "text", pts: 8 },
  { id: "smoy", label: "Sixth Man of the Year", type: "text", pts: 6 },
  { id: "mip", label: "Most Improved Player", type: "text", pts: 6 },
  { id: "coy", label: "Coach of the Year", type: "text", pts: 6 },
  { id: "scoring", label: "Scoring champion", type: "text", pts: 6 },
];
