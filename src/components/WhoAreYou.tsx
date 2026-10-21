"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

export function WhoAreYou({ players, onChoose }: { players: string[]; onChoose: (p: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const confirmBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (picked) confirmBox.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [picked]);

  return (
    <div className="mx-auto max-w-3xl py-6">
      <h2 className="text-center text-4xl font-extrabold uppercase">Kas tu?</h2>
      <p className="mt-1 text-center text-muted">Pasirink savo vardą – tavo spėjimai bus išsaugoti juo.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
        <div ref={confirmBox} className="card mt-6 text-center" role="dialog" aria-label="Patvirtink vardą">
          <p className="text-lg">
            Ar tu – <b className="text-orange">{picked}</b>?
          </p>
          <p className="mt-1 text-[13px] text-muted">Šis telefonas ar kompiuteris tave įsimins. Rinkis tik savo vardą.</p>
          <div className="mt-4 flex justify-center gap-2.5">
            <Button variant="secondary" onClick={() => setPicked(null)}>
              Ne, grįžti
            </Button>
            <Button onClick={() => onChoose(picked)}>Taip, tai aš</Button>
          </div>
        </div>
      )}
    </div>
  );
}
