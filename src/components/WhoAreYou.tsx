"use client";

import { useState } from "react";
import { Button } from "./ui";

export function WhoAreYou({ players, onChoose }: { players: string[]; onChoose: (p: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-xl py-6">
      <h2 className="text-center text-4xl font-extrabold uppercase">Who are you?</h2>
      <p className="mt-1 text-center text-muted">Pick your name. Your predictions are saved under it.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((p) => (
          <button
            key={p}
            onClick={() => setPicked(p)}
            aria-pressed={picked === p}
            className={`rounded-2xl border-2 px-4 py-4 text-center font-display text-xl font-bold uppercase transition ${
              picked === p ? "border-orange bg-orange text-white" : "border-line bg-card hover:border-orange"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {picked && (
        <div className="card mt-6 text-center" role="dialog" aria-label="Confirm your name">
          <p className="text-lg">
            Are you <b className="text-orange">{picked}</b>?
          </p>
          <p className="mt-1 text-[13px] text-muted">This phone or computer will remember you. Only pick your own name.</p>
          <div className="mt-4 flex justify-center gap-2.5">
            <Button variant="secondary" onClick={() => setPicked(null)}>
              No, go back
            </Button>
            <Button onClick={() => onChoose(picked)}>Yes, that&apos;s me</Button>
          </div>
        </div>
      )}
    </div>
  );
}
