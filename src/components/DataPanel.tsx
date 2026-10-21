"use client";

import { useState } from "react";
import { addPlayer, removePlayer } from "@/lib/state";
import type { AppData } from "@/lib/types";
import type { FileState } from "@/hooks/usePredictions";
import { Button, Field, SectionHead, Tag } from "./ui";

type Update = (fn: (d: AppData) => AppData) => boolean;

interface Props {
  data: AppData;
  file: FileState;
  canLink: boolean;
  update: Update;
  notify: (m: string) => void;
  onCreateFile: () => void;
  onOpenFile: () => void;
  onReconnect: () => void;
  onUnlink: () => void;
  onDownload: () => void;
  onUpload: (f: File) => void;
  onReset: () => void;
}

export function DataPanel(p: Props) {
  const [name, setName] = useState("");
  const [season, setSeason] = useState(p.data.season);
  const { data, update } = p;

  return (
    <section>
      <SectionHead title="Data">Everything lives in a JSON file on your computer — nothing is sent to a server.</SectionHead>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="text-2xl font-extrabold uppercase">JSON file</h2>
          {p.canLink ? (
            <>
              <p className="mb-3.5 text-[13px] text-muted">
                Link a .json file and every change is written to it automatically. The link is remembered next time you open the site.
              </p>
              {p.file.kind === "linked" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="good">Linked</Tag>
                  <span className="text-sm font-semibold">{p.file.name}</span>
                  <Button variant="ghost" small onClick={p.onUnlink}>
                    Unlink
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {p.file.kind === "reconnect" && <Button onClick={p.onReconnect}>Reconnect {p.file.name}</Button>}
                  <Button variant={p.file.kind === "reconnect" ? "secondary" : "primary"} onClick={p.onCreateFile}>
                    Create linked file
                  </Button>
                  <Button variant="secondary" onClick={p.onOpenFile}>
                    Open linked file
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="mb-3.5 text-[13px] text-muted">
              This browser can&apos;t save straight to a file (Chrome and Edge can). Download a copy whenever you like and open it again later.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2.5">
            <Button variant="secondary" onClick={p.onDownload}>
              Download JSON
            </Button>
            <label className="inline-flex cursor-pointer items-center rounded-[10px] bg-purple-soft px-3.5 py-2 text-sm font-semibold text-on-purple-soft hover:brightness-95">
              Load JSON…
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) p.onUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="mt-3 text-[13px] text-muted">A copy is also kept in this browser, so closing the tab never loses picks.</p>
        </div>

        <div className="card">
          <h2 className="text-2xl font-extrabold uppercase">Players</h2>
          <p className="mb-3.5 text-[13px] text-muted">Add everyone in your league, then choose who&apos;s predicting at the top.</p>
          <form
            className="flex items-end gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (update((d) => addPlayer(d, name))) {
                p.notify(`${name.trim()} joined`);
                setName("");
              }
            }}
          >
            <Field label="Name" htmlFor="pl-name" className="flex-1">
              <input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            </Field>
            <Button type="submit">Add player</Button>
          </form>
          <div className="mt-2.5">
            {data.players.map((pl) => (
              <div key={pl.id} className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-t-0">
                <div className="min-w-0 flex-1">
                  {pl.name} {pl.id === data.activePlayer && <Tag tone="open">You</Tag>}
                </div>
                {data.players.length > 1 && (
                  <Button
                    variant="ghost"
                    small
                    onClick={() => confirm(`Remove ${pl.name} and all their picks?`) && update((d) => removePlayer(d, pl.id))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-extrabold uppercase">Season</h2>
          <p className="mb-3.5 text-[13px] text-muted">Shown in the header.</p>
          <Field label="Season" htmlFor="season">
            <input
              id="season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              onBlur={() => season.trim() && update((d) => ({ ...d, season: season.trim() }))}
            />
          </Field>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => confirm("Start a fresh file? Download a copy first if you want to keep the current picks.") && p.onReset()}
          >
            Start a fresh file
          </Button>
        </div>
      </div>
    </section>
  );
}
