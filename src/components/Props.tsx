"use client";

import { useState } from "react";
import { addProp, isPropLocked, pickProp, removeProp, setPropAnswer } from "@/lib/state";
import type { AppData, Prop } from "@/lib/types";
import { Button, Empty, Field, Points, SectionHead, Tag } from "./ui";

type Update = (fn: (d: AppData) => AppData) => boolean;

export function Props({ data, now, update, notify }: { data: AppData; now: Date; update: Update; notify: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState("Yes, No");
  const [deadline, setDeadline] = useState("");
  const [pts, setPts] = useState("3");

  const add = () => {
    if (update((d) => addProp(d, { q, options: options.split(","), deadline: deadline || null, pts: Number(pts) }))) {
      setQ("");
      notify("Prop added");
    }
  };

  return (
    <section>
      <SectionHead title="Props">Your own questions during the season — trades, streaks, stat lines, anything.</SectionHead>
      <div className="card mb-4">
        <h3 className="text-lg font-extrabold uppercase">New prop</h3>
        <div className="mt-2 flex flex-wrap items-end gap-2.5">
          <Field label="Question" htmlFor="p-q" className="flex-[3_1_260px]">
            <input id="p-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Will the West's top seed win 60+ games?" />
          </Field>
          <Field label="Answers (comma separated)" htmlFor="p-opts" className="flex-[1_1_150px]">
            <input id="p-opts" value={options} onChange={(e) => setOptions(e.target.value)} />
          </Field>
          <Field label="Locks" htmlFor="p-deadline" className="flex-[0_1_160px]">
            <input id="p-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Points" htmlFor="p-pts" className="flex-[0_1_90px]">
            <input id="p-pts" type="number" min={1} max={50} value={pts} onChange={(e) => setPts(e.target.value)} />
          </Field>
          <Button onClick={add}>Add prop</Button>
        </div>
      </div>

      {data.props.length === 0 ? (
        <Empty>No props yet. Add a question above.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.props.map((p) => (
            <PropCard key={p.id} prop={p} data={data} now={now} update={update} />
          ))}
        </div>
      )}
    </section>
  );
}

function PropCard({ prop: p, data, now, update }: { prop: Prop; data: AppData; now: Date; update: Update }) {
  const me = data.activePlayer;
  const pick = data.propPicks[me]?.[p.id];
  const locked = isPropLocked(p, now) || p.answer != null;
  const count = (o: string) => data.players.filter((pl) => data.propPicks[pl.id]?.[p.id] === o).length;

  let tag;
  if (p.answer != null) tag = pick === p.answer ? <Tag tone="good">+{p.pts}</Tag> : <Tag tone="bad">{pick ? "Missed" : "No pick"}</Tag>;
  else if (isPropLocked(p, now)) tag = <Tag tone="lock">Locked</Tag>;
  else
    tag = (
      <Tag tone="open">
        Open{p.deadline && ` until ${new Date(`${p.deadline}T12:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
      </Tag>
    );

  return (
    <div className="card">
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-xl font-bold">
          {p.q}
          <Points value={p.pts} />
        </h3>
        <Button variant="ghost" small onClick={() => confirm("Remove this prop?") && update((d) => removeProp(d, p.id))}>
          Remove
        </Button>
      </div>
      <div className="mb-3 mt-1.5">{tag}</div>
      <div className="flex flex-wrap gap-1.5">
        {p.options.map((o) => (
          <button
            key={o}
            disabled={locked}
            aria-pressed={pick === o}
            onClick={() => update((d) => pickProp(d, me, p.id, o, now))}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold disabled:cursor-default ${
              pick === o ? "border-purple bg-purple text-white" : "border-line bg-card"
            }`}
          >
            {o} <span className="opacity-60">· {count(o)}</span>
          </button>
        ))}
      </div>
      <Field label="Correct answer" htmlFor={`pa-${p.id}`} className="mt-3.5">
        <select id={`pa-${p.id}`} value={p.answer ?? ""} onChange={(e) => update((d) => setPropAnswer(d, p.id, e.target.value || null))}>
          <option value="">— not decided —</option>
          {p.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}
