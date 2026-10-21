"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { DataPanel } from "@/components/DataPanel";
import { GamePicks } from "@/components/GamePicks";
import { LeaderboardTable } from "@/components/Leaderboard";
import { Props } from "@/components/Props";
import { SeasonPicks } from "@/components/SeasonPicks";
import { SectionHead, Toast } from "@/components/ui";
import { useNow, usePredictions } from "@/hooks/usePredictions";
import { leaderboard } from "@/lib/scoring";
import { setActivePlayer } from "@/lib/state";
import { supportsLinkedFiles } from "@/lib/storage";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const TABS = [
  ["dash", "Dashboard"],
  ["games", "Game picks"],
  ["season", "Season picks"],
  ["props", "Props"],
  ["board", "Leaderboard"],
  ["data", "Data"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function Home() {
  const [tab, setTab] = useState<Tab>("dash");
  const [toast, setToast] = useState<string | null>(null);
  const [canLink, setCanLink] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  const p = usePredictions(notify);
  const now = useNow();

  useEffect(() => setCanLink(supportsLinkedFiles()), []);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const data = p.data;
  const viewKey = data ? `${p.revision}-${data.activePlayer}` : "";

  return (
    <>
      <header className="relative overflow-hidden bg-purple text-white">
        <div aria-hidden className="absolute -right-16 -top-10 size-64 rounded-full border-[28px] border-orange opacity-20" />
        <div className="relative mx-auto flex max-w-[1100px] flex-wrap items-center gap-3.5 px-4 pt-4.5 sm:flex-nowrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/logo.png`} alt="FrontCourt Office logo" width={52} height={56} className="h-14 w-13 flex-none rounded-[10px] object-cover ring-3 ring-white/10" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] font-extrabold uppercase leading-none sm:text-[28px]">
              FrontCourt <span className="text-orange">Office</span>
            </h1>
            <p className="mt-1 text-[13px] opacity-75">Spėlionė · Fantasy NBA predictions{data && ` · ${data.season} season`}</p>
          </div>
          {data && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label htmlFor="player" className="whitespace-nowrap text-xs opacity-75">
                Predicting as
              </label>
              <select
                id="player"
                value={data.activePlayer}
                onChange={(e) => p.update((d) => setActivePlayer(d, e.target.value))}
                className="flex-1 rounded-full! border-purple-line! bg-purple-deep! px-3! py-1.5! text-white! sm:max-w-44"
              >
                {data.players.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <nav className="relative mx-auto flex max-w-[1100px] gap-1 overflow-x-auto px-4 pt-3.5 [scrollbar-width:none]" aria-label="Sections">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`whitespace-nowrap rounded-t-[10px] px-3.5 py-2.5 font-display text-lg font-bold uppercase ${
                tab === id ? "bg-bg text-purple dark:text-orange" : "text-white opacity-70 hover:opacity-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5.5">
        {!data ? (
          <p className="py-20 text-center text-muted">Loading your picks…</p>
        ) : (
          <>
            <SaveBanner file={p.file} onReconnect={p.reconnect} onOpenData={() => go("data")} />
            <div key={viewKey}>
              {tab === "dash" && <Dashboard data={data} now={now} go={go} />}
              {tab === "games" && <GamePicks data={data} now={now} update={p.update} notify={notify} />}
              {tab === "season" && <SeasonPicks data={data} now={now} update={p.update} />}
              {tab === "props" && <Props data={data} now={now} update={p.update} notify={notify} />}
              {tab === "board" && (
                <section>
                  <SectionHead title="Leaderboard">
                    Games: 1 pt per correct winner, +1 if your margin is within 3. Season picks and props score their listed points.
                  </SectionHead>
                  <div className="card overflow-x-auto">
                    <LeaderboardTable rows={leaderboard(data)} me={data.activePlayer} />
                  </div>
                </section>
              )}
              {tab === "data" && (
                <DataPanel
                  data={data}
                  file={p.file}
                  canLink={canLink}
                  update={p.update}
                  notify={notify}
                  onCreateFile={p.createFile}
                  onOpenFile={p.openFile}
                  onReconnect={p.reconnect}
                  onUnlink={p.unlink}
                  onDownload={p.download}
                  onUpload={p.importUpload}
                  onReset={p.reset}
                />
              )}
            </div>
          </>
        )}
      </main>
      <footer className="px-4 pb-8 text-center text-xs text-muted">FrontCourt Office Spėlionė · fan-made, not affiliated with the NBA.</footer>
      <Toast message={toast} />
    </>
  );
}

function SaveBanner({ file, onReconnect, onOpenData }: { file: ReturnType<typeof usePredictions>["file"]; onReconnect: () => void; onOpenData: () => void }) {
  const box = "mb-4 flex items-center gap-2.5 rounded-xl bg-purple-soft px-3.5 py-2.5 text-[13px]";
  if (file.kind === "linked")
    return (
      <div className={box}>
        <span className="size-2 flex-none rounded-full bg-good" />
        <span>
          Saving to <b>{file.name}</b> on this computer.
        </span>
      </div>
    );
  if (file.kind === "reconnect")
    return (
      <div className={box}>
        <span className="size-2 flex-none rounded-full bg-orange" />
        <span className="flex-1">
          Saved in this browser. <b>{file.name}</b> needs one click to keep saving.
        </span>
        <button className="font-semibold text-orange underline" onClick={onReconnect}>
          Reconnect
        </button>
      </div>
    );
  return (
    <div className={box}>
      <span className="size-2 flex-none rounded-full bg-muted" />
      <span>
        Saved in this browser.{" "}
        <button className="font-semibold text-orange underline" onClick={onOpenData}>
          Link a JSON file
        </button>{" "}
        or download one to keep a copy.
      </span>
    </div>
  );
}
