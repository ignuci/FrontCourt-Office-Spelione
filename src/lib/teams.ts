import type { Conference, Team } from "./types.ts";

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
