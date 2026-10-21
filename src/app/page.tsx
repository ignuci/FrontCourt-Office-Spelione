"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { StageView } from "@/components/StageView";
import { Standings } from "@/components/Standings";
import { Toast } from "@/components/ui";
import { WhoAreYou } from "@/components/WhoAreYou";
import { useLeague } from "@/hooks/useLeague";
import { useNow } from "@/hooks/useNow";
import { stageStatus } from "@/lib/league";

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

  return (
    <>
      <header className="relative overflow-hidden bg-purple text-white">
        <div aria-hidden className="absolute -right-16 -top-10 size-64 rounded-full border-[28px] border-orange opacity-20" />
        <div className="relative mx-auto flex max-w-[1100px] flex-wrap items-center gap-3 px-4 pt-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-extrabold uppercase leading-none sm:text-[32px]">
              FrontCourt <span className="text-orange">Office</span>
            </h1>
            <p className="mt-1 text-[13px] opacity-75">Spėlionė · NBA fantasy spėjimai · {L.league.season}</p>
          </div>
          {L.player && (
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-purple-deep px-3 py-1.5 font-semibold">{L.player}</span>
              <button
                className="text-xs underline opacity-75 hover:opacity-100"
                onClick={() => confirm("Pakeisti žaidėją? Pateikti spėjimai liks išsaugoti.") && L.forgetPlayer()}
              >
                Ne tu?
              </button>
            </div>
          )}
        </div>
        {L.player ? (
          <nav className="relative mx-auto flex max-w-[1100px] items-end gap-1 overflow-x-auto px-4 pt-4 [scrollbar-width:none]" aria-label="Skiltys">
            {L.league.stages.map((s) => (
              <NavTab key={s.id} on={tab === s.id} onClick={() => go(s.id)} dot={stageStatus(s, now) === "open" && !L.mine[s.id]}>
                {s.name}
              </NavTab>
            ))}
            <NavTab on={tab === "board"} onClick={() => go("board")}>
              Lentelė
            </NavTab>
          </nav>
        ) : (
          <div className="h-5" />
        )}
      </header>

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-6">
        {!L.ready ? (
          <p className="py-20 text-center text-muted">Kraunama…</p>
        ) : !L.player ? (
          <WhoAreYou
            players={L.league.players}
            onChoose={(p) => {
              L.choosePlayer(p);
              notify("Labas! Sėkmės spėjant.");
            }}
          />
        ) : (
          <>
            {L.sync.kind === "error" && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] text-bad">
                <span className="flex-1">{L.sync.message}</span>
                <button className="font-semibold underline" onClick={() => void L.refresh()}>
                  Bandyti dar kartą
                </button>
              </div>
            )}
            {!L.canSave && (
              <div className="mb-4 rounded-xl bg-purple-soft px-3.5 py-2.5 text-[13px]">
                Spėjimų išsaugojimas dar neįjungtas. Gali apsižvalgyti ir pildyti atsakymus – pateikti bus galima, kai viskas bus paruošta.
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
                  if (r.ok) notify("Spėjimai pateikti – sėkmės!");
                  return r;
                }}
              />
            )}
            {tab === "board" && <Standings league={L.league} submissions={L.submissions} me={L.player} now={now} />}
          </>
        )}
      </main>
      <footer className="px-4 pb-8 text-center text-xs text-muted">FrontCourt Office Spėlionė · sukurta fanų, nesusijusi su NBA.</footer>
      <Toast message={toast} />
    </>
  );
}

function NavTab({ on, onClick, children, dot }: { on: boolean; onClick: () => void; children: ReactNode; dot?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-current={on ? "page" : undefined}
      className={`relative whitespace-nowrap rounded-t-[10px] px-3.5 py-2.5 font-display text-lg font-bold uppercase ${
        on ? "bg-bg text-purple dark:text-orange" : "text-white opacity-75 hover:opacity-100"
      }`}
    >
      {children}
      {dot && <span className="absolute right-1.5 top-2 size-2 rounded-full bg-orange" aria-label="atidaryta" />}
    </button>
  );
}
