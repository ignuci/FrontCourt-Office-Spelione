import { leaderboard, scorePlayer } from "@/lib/scoring";
import { isGameLocked } from "@/lib/state";
import type { AppData } from "@/lib/types";
import { formatWhen } from "./GamePicks";
import { LeaderboardTable } from "./Leaderboard";
import { Button, Empty } from "./ui";

export function Dashboard({ data, now, go }: { data: AppData; now: Date; go: (tab: "games") => void }) {
  const me = data.activePlayer;
  const s = scorePlayer(data, me);
  const board = leaderboard(data);
  const rank = board.find((r) => r.id === me)?.rank ?? 1;
  const accuracy = s.gameGraded ? `${Math.round((100 * s.gameCorrect) / s.gameGraded)}%` : "—";
  const next = data.games
    .filter((g) => !isGameLocked(g, now) && !data.gamePicks[me]?.[g.id]?.winner)
    .sort((a, b) => a.when.localeCompare(b.when))
    .slice(0, 5);

  return (
    <section>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total points" value={s.total} tone="orange" />
        <Stat label="Rank" value={rank} suffix={` / ${data.players.length}`} tone="purple" />
        <Stat label="Pick accuracy" value={accuracy} />
        <Stat label="Picks pending" value={s.pending} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-2xl font-extrabold uppercase">Up next</h2>
          <p className="mb-3.5 text-[13px] text-muted">Open games you haven&apos;t picked yet.</p>
          {next.length === 0 ? (
            <Empty>
              No open games to pick.{" "}
              <button className="font-semibold text-orange underline" onClick={() => go("games")}>
                Add the next games
              </button>
            </Empty>
          ) : (
            next.map((g) => {
              const w = formatWhen(g.when);
              return (
                <div key={g.id} className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <b>
                      {g.away} @ {g.home}
                    </b>
                    <div className="text-[13px] text-muted">
                      {w.day} · {w.time}
                    </div>
                  </div>
                  <Button small onClick={() => go("games")}>
                    Pick
                  </Button>
                </div>
              );
            })
          )}
        </div>
        <div className="card">
          <h2 className="text-2xl font-extrabold uppercase">Standings</h2>
          <p className="mb-3.5 text-[13px] text-muted">Everyone predicting in this file.</p>
          <LeaderboardTable rows={board.slice(0, 5)} me={me} compact />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string | number; suffix?: string; tone?: "orange" | "purple" }) {
  const style =
    tone === "orange" ? "border-orange bg-orange text-white" : tone === "purple" ? "border-purple bg-purple text-white" : "border-line bg-card";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${style}`}>
      <div className={`text-xs font-semibold uppercase tracking-wider ${tone ? "text-white/80" : "text-muted"}`}>{label}</div>
      <div className="font-display text-4xl font-extrabold leading-tight">
        {value}
        {suffix && <span className="text-xl opacity-70">{suffix}</span>}
      </div>
    </div>
  );
}
