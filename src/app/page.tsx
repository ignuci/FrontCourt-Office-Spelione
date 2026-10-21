"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GamePicks } from "@/components/GamePicks";
import { Props } from "@/components/Props";
import { SeasonPicks } from "@/components/SeasonPicks";
import { StageView } from "@/components/StageView";
import { Standings } from "@/components/Standings";
import { Toast } from "@/components/ui";
import { WhoAreYou } from "@/components/WhoAreYou";
import { useLeague } from "@/hooks/useLeague";
import { useNow, usePredictions } from "@/hooks/usePredictions";
import { stageStatus } from "@/lib/league";

// Old tabs kept as inspiration while the stage questions are written. Remove when no longer needed.
const IDEAS = [
  ["idea-games", "Game picks"],
  ["idea-season", "Season picks"],
  ["idea-props", "Props"],
] as const;

export default function Home() {
  const L = useLeague();
  const now = useNow();
  const [tab, setTab] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  const ideas = usePredictions(notify);

  // Start on the stage that's open now, otherwise the leaderboard.
  useEffect(() => {
    if (tab) return;
    const open = L.league.stages.find((s) => stageStatus(s, now) === "open");
    setTab(open?.id ?? "board");
  }, [tab, L.league.stages, now]);

  const go = (t: string) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const stage = L.league.stages.find((s) => s.id === tab);
  const showPicker = L.ready && !L.player;

  return (
    <>
      <header className="relative overflow-hidden bg-purple text-white">
        <div aria-hidden className="absolute -right-16 -top-10 size-64 rounded-full border-[28px] border-orange opacity-20" />
        <div className="relative mx-auto flex max-w-[1100px] flex-wrap items-center gap-3 px-4 pt-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-extrabold uppercase leading-none sm:text-[32px]">
              FrontCourt <span className="text-orange">Office</span>
            </h1>
            <p className="mt-1 text-[13px] opacity-75">Spėlionė · Fantasy NBA predictions · {L.league.season}</p>
          </div>
          {L.player && (
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-purple-deep px-3 py-1.5 font-semibold">{L.player}</span>
              <button
                className="text-xs underline opacity-75 hover:opacity-100"
                onClick={() => confirm(`Switch away from ${L.player}? Submitted answers stay saved.`) && L.forgetPlayer()}
              >
                Not you?
              </button>
            </div>
          )}
        </div>
        {!showPicker && L.player && (
          <nav className="relative mx-auto flex max-w-[1100px] items-end gap-1 overflow-x-auto px-4 pt-4 [scrollbar-width:none]" aria-label="Sections">
            {L.league.stages.map((s) => (
              <NavTab key={s.id} on={tab === s.id} onClick={() => go(s.id)} dot={stageStatus(s, now) === "open" && !L.mine[s.id]}>
                {s.name}
              </NavTab>
            ))}
            <NavTab on={tab === "board"} onClick={() => go("board")}>
              Leaderboard
            </NavTab>
            <span className="mx-2 mb-2.5 h-5 w-px flex-none bg-white/25" aria-hidden />
            {IDEAS.map(([id, label]) => (
              <NavTab key={id} on={tab === id} onClick={() => go(id)} small>
                {label}
              </NavTab>
            ))}
          </nav>
        )}
        {(showPicker || !L.player) && <div className="h-5" />}
      </header>

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-6">
        {!L.ready ? (
          <p className="py-20 text-center text-muted">Loading…</p>
        ) : !L.player ? (
          <WhoAreYou players={L.league.players} onChoose={(p) => {
              L.choosePlayer(p);
              notify(`Hi, ${p}!`);
            }} />
        ) : (
          <>
            {L.sync.kind === "error" && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] text-bad">
                <span className="flex-1">Can&apos;t reach the answer sheet right now: {L.sync.message}</span>
                <button className="font-semibold underline" onClick={() => void L.refresh()}>
                  Try again
                </button>
              </div>
            )}
            {!L.canSave && (
              <div className="mb-4 rounded-xl bg-purple-soft px-3.5 py-2.5 text-[13px]">
                Saving to the answer sheet isn&apos;t switched on yet. You can look around and fill in answers; submitting opens once it&apos;s set up.
              </div>
            )}

            {stage && (
              <StageView
                key={`${stage.id}-${L.player}`}
                league={L.league}
                stage={stage}
                player={L.player}
                now={now}
                draft={L.drafts[stage.id] ?? {}}
                submission={L.mine[stage.id]}
                submissions={L.submissions}
                pending={L.isPending(stage.id)}
                canSave={L.canSave}
                onAnswer={(qid, v) => L.setAnswer(stage.id, qid, v)}
                onSubmit={async () => {
                  const r = await L.submit(stage.id);
                  if (r.ok) notify(`${stage.name} submitted — good luck!`);
                  return r;
                }}
              />
            )}
            {tab === "board" && <Standings league={L.league} submissions={L.submissions} me={L.player} now={now} />}

            {tab?.startsWith("idea-") && (
              <>
                <p className="mb-4 rounded-xl bg-orange-soft px-3.5 py-2.5 text-[13px] text-orange-deep">
                  Inspiration only — these pages aren&apos;t part of the competition and will be removed.
                </p>
                {ideas.data && tab === "idea-games" && <GamePicks data={ideas.data} now={now} update={ideas.update} notify={notify} />}
                {ideas.data && tab === "idea-season" && <SeasonPicks data={ideas.data} now={now} update={ideas.update} />}
                {ideas.data && tab === "idea-props" && <Props data={ideas.data} now={now} update={ideas.update} notify={notify} />}
              </>
            )}
          </>
        )}
      </main>
      <footer className="px-4 pb-8 text-center text-xs text-muted">FrontCourt Office Spėlionė · fan-made, not affiliated with the NBA.</footer>
      <Toast message={toast} />
    </>
  );
}

function NavTab({ on, onClick, children, small, dot }: { on: boolean; onClick: () => void; children: ReactNode; small?: boolean; dot?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={`relative whitespace-nowrap rounded-t-[10px] font-display font-bold uppercase ${small ? "px-2.5 py-2 text-sm" : "px-3.5 py-2.5 text-lg"} ${
        on ? "bg-bg text-purple dark:text-orange" : `text-white hover:opacity-100 ${small ? "opacity-50" : "opacity-75"}`
      }`}
    >
      {children}
      {dot && <span className="absolute right-1.5 top-2 size-2 rounded-full bg-orange" aria-label="open" />}
    </button>
  );
}
