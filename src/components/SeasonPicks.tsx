"use client";

import { useState } from "react";
import { answersMatch } from "@/lib/scoring";
import { isSeasonLocked, setSeasonPick, setSeasonResult } from "@/lib/state";
import { SEASON_QUESTIONS } from "@/lib/teams";
import type { AppData, SeasonQuestion } from "@/lib/types";
import { TeamSelect } from "./TeamSelect";
import { Field, Points, SectionHead, Tag } from "./ui";

type Update = (fn: (d: AppData) => AppData) => boolean;

export function SeasonPicks({ data, now, update }: { data: AppData; now: Date; update: Update }) {
  const locked = isSeasonLocked(data, now);
  const me = data.activePlayer;
  return (
    <section>
      <SectionHead
        title="Season picks"
        aside={
          <Field label="Picks lock on" htmlFor="lock-date" className="w-48">
            <input
              id="lock-date"
              type="date"
              value={data.seasonLock}
              onChange={(e) => update((d) => ({ ...d, seasonLock: e.target.value }))}
            />
          </Field>
        }
      >
        Big calls for the whole season. They lock at the end of the lock date.
      </SectionHead>

      <div className="card">
        <div className="hidden grid-cols-3 gap-2.5 text-[13px] text-muted sm:grid">
          <div>Question</div>
          <div>Your pick</div>
          <div>Actual result</div>
        </div>
        {SEASON_QUESTIONS.map((q) => (
          <Question
            key={`${me}-${q.id}`}
            q={q}
            pick={data.seasonPicks[me]?.[q.id] ?? ""}
            result={data.seasonResults[q.id] ?? ""}
            locked={locked}
            onPick={(v) => update((d) => setSeasonPick(d, me, q.id, v, now))}
            onResult={(v) => update((d) => setSeasonResult(d, q.id, v))}
          />
        ))}
        <p className="mt-3 text-[13px] text-muted">
          {locked ? "Season picks are locked." : "You can change picks until the lock date."} Text answers match regardless of capitals or accents.
        </p>
      </div>
    </section>
  );
}

function Question({
  q, pick, result, locked, onPick, onResult,
}: { q: SeasonQuestion; pick: string; result: string; locked: boolean; onPick: (v: string) => void; onResult: (v: string) => void }) {
  const [pickDraft, setPickDraft] = useState(pick);
  const [resultDraft, setResultDraft] = useState(result);
  const decided = result && pick;
  return (
    <div className="grid grid-cols-1 items-center gap-2.5 border-t border-line py-3 first-of-type:border-t-0 sm:grid-cols-3">
      <div>
        <b className="block">
          {q.label}
          <Points value={q.pts} />
        </b>
        {decided && (answersMatch(result, pick) ? <Tag tone="good">+{q.pts}</Tag> : <Tag tone="bad">Missed</Tag>)}
      </div>
      {q.type === "team" ? (
        <>
          <TeamSelect aria-label={`Your pick: ${q.label}`} conf={q.conf} value={pick} disabled={locked} onChange={(e) => onPick(e.target.value)} />
          <TeamSelect aria-label={`Result: ${q.label}`} conf={q.conf} placeholder="— not decided —" value={result} onChange={(e) => onResult(e.target.value)} />
        </>
      ) : (
        <>
          <input
            aria-label={`Your pick: ${q.label}`}
            placeholder="Player or coach"
            value={pickDraft}
            disabled={locked}
            onChange={(e) => setPickDraft(e.target.value)}
            onBlur={() => pickDraft !== pick && onPick(pickDraft)}
          />
          <input
            aria-label={`Result: ${q.label}`}
            placeholder="Not decided"
            value={resultDraft}
            onChange={(e) => setResultDraft(e.target.value)}
            onBlur={() => resultDraft !== result && onResult(resultDraft)}
          />
        </>
      )}
    </div>
  );
}
