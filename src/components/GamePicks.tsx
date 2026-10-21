"use client";

import { useState } from "react";
import { addGame, isGameLocked, pickWinner, removeGame, setMargin, setResult } from "@/lib/state";
import { TEAM_BY_AB } from "@/lib/teams";
import type { AppData, Game, GamePick } from "@/lib/types";
import { TeamSelect } from "./TeamSelect";
import { Button, Empty, Field, SectionHead, Tag } from "./ui";

type Update = (fn: (d: AppData) => AppData) => boolean;
type Filter = "open" | "pending" | "final" | "all";
const FILTERS: [Filter, string][] = [["open", "Open"], ["pending", "Awaiting result"], ["final", "Final"], ["all", "All"]];

/** "YYYY-MM-DDTHH:mm" for today at 19:30 local time, for the datetime-local input. */
function defaultTipoff(): string {
  const d = new Date();
  d.setHours(19, 30, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

export function GamePicks({ data, now, update, notify }: { data: AppData; now: Date; update: Update; notify: (m: string) => void }) {
  const [filter, setFilter] = useState<Filter>("open");
  const [when, setWhen] = useState(defaultTipoff);
  const [away, setAway] = useState("");
  const [home, setHome] = useState("");
  const me = data.activePlayer;

  const add = () => {
    if (update((d) => addGame(d, { when, away, home }))) {
      notify(`Added ${away} @ ${home}`);
      setAway("");
      setHome("");
    }
  };

  let games = [...data.games].sort((a, b) => a.when.localeCompare(b.when));
  if (filter === "open") games = games.filter((g) => !isGameLocked(g, now));
  if (filter === "pending") games = games.filter((g) => isGameLocked(g, now) && !g.result);
  if (filter === "final") games = games.filter((g) => g.result).reverse();

  return (
    <section>
      <SectionHead title="Game picks">Pick the winner. Guess the margin too for a bonus point if you&apos;re within 3.</SectionHead>

      <div className="card mb-4">
        <h3 className="text-lg font-extrabold uppercase">Add a game</h3>
        <div className="mt-2 flex flex-wrap items-end gap-2.5">
          <Field label="Tip-off" htmlFor="g-when" className="flex-[1_1_180px]">
            <input id="g-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Away" htmlFor="g-away" className="flex-[1_1_150px]">
            <TeamSelect id="g-away" placeholder="Away team" value={away} onChange={(e) => setAway(e.target.value)} />
          </Field>
          <Field label="Home" htmlFor="g-home" className="flex-[1_1_150px]">
            <TeamSelect id="g-home" placeholder="Home team" value={home} onChange={(e) => setHome(e.target.value)} />
          </Field>
          <Button onClick={add}>Add game</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter games">
        {FILTERS.map(([f, label]) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
              filter === f ? "border-purple bg-purple text-white" : "border-line bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {games.length === 0 ? (
        <Empty>{data.games.length ? "Nothing here right now." : "No games yet — add tonight's matchups above."}</Empty>
      ) : (
        games.map((g) => (
          <GameRow key={`${g.id}-${me}`} game={g} pick={data.gamePicks[me]?.[g.id]} locked={isGameLocked(g, now)} update={update} me={me} now={now} notify={notify} />
        ))
      )}
    </section>
  );
}

function GameRow({
  game: g, pick, locked, update, me, now, notify,
}: { game: Game; pick?: GamePick; locked: boolean; update: Update; me: string; now: Date; notify: (m: string) => void }) {
  const w = formatWhen(g.when);
  const [margin, setMarginDraft] = useState(pick?.margin?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(g.result?.away.toString() ?? "");
  const [homeScore, setHomeScore] = useState(g.result?.home.toString() ?? "");

  const saveResult = () => {
    if (awayScore === "" && homeScore === "") return update((d) => setResult(d, g.id, null));
    if (awayScore === "" || homeScore === "") return;
    const score = { away: Number(awayScore), home: Number(homeScore) };
    if (update((d) => setResult(d, g.id, score))) notify(`Final saved: ${g.away} ${score.away} – ${score.home} ${g.home}`);
  };

  let status;
  if (g.result) {
    status = !pick?.winner ? <Tag tone="lock">No pick</Tag> : pick.winner === g.result.winner ? <Tag tone="good">Correct</Tag> : <Tag tone="bad">Missed</Tag>;
  } else status = locked ? <Tag tone="lock">Locked</Tag> : <Tag tone="open">Open</Tag>;

  return (
    <div className="mb-2.5 grid grid-cols-1 items-center gap-3.5 rounded-xl border border-line bg-card p-3.5 md:grid-cols-[110px_1fr_auto]">
      <div className="text-xs leading-snug text-muted">
        <b className="block text-sm text-ink">{w.day}</b>
        {w.time}
        <div className="mt-1.5">{status}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TeamButton game={g} ab={g.away} picked={pick?.winner === g.away} locked={locked} onPick={() => update((d) => pickWinner(d, me, g.id, g.away, now))} />
        <span className="text-xs font-semibold text-muted">@</span>
        <TeamButton game={g} ab={g.home} picked={pick?.winner === g.home} locked={locked} onPick={() => update((d) => pickWinner(d, me, g.id, g.home, now))} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 md:flex-col md:items-end">
        <input
          className="w-21! px-2! py-1.5! text-[13px]!"
          type="number"
          min={1}
          max={80}
          placeholder="Margin"
          aria-label="Winning margin"
          value={margin}
          disabled={locked}
          onChange={(e) => setMarginDraft(e.target.value)}
          onBlur={() => update((d) => setMargin(d, me, g.id, margin === "" ? null : Number(margin), now))}
        />
        {locked && (
          <div className="flex items-center gap-1.5" title="Final score (away – home)">
            <input className="w-16! p-1.5! text-center text-[13px]!" type="number" min={0} aria-label={`${g.away} score`} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} onBlur={saveResult} />
            <span className="text-xs text-muted">–</span>
            <input className="w-16! p-1.5! text-center text-[13px]!" type="number" min={0} aria-label={`${g.home} score`} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} onBlur={saveResult} />
          </div>
        )}
        <Button
          variant="ghost"
          small
          onClick={() => confirm("Remove this game and everyone's picks for it?") && update((d) => removeGame(d, g.id))}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function TeamButton({ game, ab, picked, locked, onPick }: { game: Game; ab: string; picked: boolean; locked: boolean; onPick: () => void }) {
  const t = TEAM_BY_AB[ab];
  const won = game.result?.winner === ab;
  return (
    <button
      disabled={locked}
      onClick={onPick}
      aria-pressed={picked}
      className={`flex flex-[1_1_140px] items-center gap-2 rounded-[10px] border-2 px-2.5 py-2 text-left ${
        picked ? "border-orange bg-orange-soft" : "border-line bg-card"
      } ${won ? "shadow-[inset_0_-3px_0_var(--c-good)]" : ""} disabled:cursor-default`}
    >
      <span
        className={`grid h-7.5 w-10 place-items-center rounded-[7px] font-display text-lg font-extrabold ${
          picked ? "bg-orange text-white" : "bg-purple-soft text-on-purple-soft"
        }`}
      >
        {ab}
      </span>
      <span className="text-[13px] leading-tight">
        {t?.name ?? ab}
        <small className="block text-[11px] text-muted">{t?.city}</small>
      </span>
    </button>
  );
}
