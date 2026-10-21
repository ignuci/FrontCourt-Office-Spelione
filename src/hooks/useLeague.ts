"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import leagueJson from "../../public/league.json";
import type { Answers, League, Submission } from "@/lib/league";
import { SaveError, fetchSubmissions, submitAnswers } from "@/lib/remote";

export const league = leagueJson as unknown as League;

/* ---------- small localStorage helpers (never throw) ---------- */
const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked — the sheet is the real copy anyway */
  }
};

const K_PLAYER = "fco-player";
const kDrafts = (p: string) => `fco-drafts:${p}`;
const kMine = (p: string) => `fco-mine:${p}`;
const K_PENDING = "fco-pending";

interface Pending {
  player: string;
  stage: string;
  answers: Answers;
  queuedAt: string;
}

export type SyncState = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; at: Date } | { kind: "error"; message: string };

export function useLeague() {
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Answers>>({});
  const [mine, setMine] = useState<Record<string, Submission>>({});
  const [pending, setPending] = useState<Pending[]>([]);
  const [remote, setRemote] = useState<Submission[]>([]);
  const [sync, setSync] = useState<SyncState>({ kind: "idle" });
  const sending = useRef(false);
  const canSave = !!league.sheetUrl;

  // Restore who this device belongs to.
  useEffect(() => {
    const p = read<string | null>(K_PLAYER, null);
    if (p && league.players.includes(p)) {
      setPlayer(p);
      setDrafts(read(kDrafts(p), {}));
      setMine(read(kMine(p), {}));
    }
    setPending(read(K_PENDING, []));
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!canSave) return;
    setSync({ kind: "loading" });
    try {
      const subs = await fetchSubmissions(league.sheetUrl, player);
      setRemote(subs);
      setSync({ kind: "ok", at: new Date() });
      // Keep a local copy of our own confirmed answers, e.g. after switching phones.
      if (player) {
        setMine((cur) => {
          const next = { ...cur };
          for (const s of subs) if (s.player === player && s.answers) next[s.stage] = s;
          write(kMine(player), next);
          return next;
        });
      }
    } catch (e) {
      setSync({ kind: "error", message: e instanceof Error ? e.message : "Couldn't reach the answer sheet." });
    }
  }, [canSave, player]);

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  /** Try to deliver anything waiting in the outbox. */
  const flush = useCallback(async () => {
    if (!canSave || sending.current) return;
    const queue = read<Pending[]>(K_PENDING, []);
    if (!queue.length) return;
    sending.current = true;
    let left = [...queue];
    let lastError: string | null = null;
    for (const item of queue) {
      try {
        const saved = await submitAnswers(league.sheetUrl, item.player, item.stage, item.answers);
        left = left.filter((x) => x !== item);
        const key = kMine(item.player);
        const mineFor = { ...read<Record<string, Submission>>(key, {}), [item.stage]: saved };
        write(key, mineFor);
        if (item.player === player) setMine(mineFor);
      } catch (e) {
        // A clear "no" from the sheet (locked, unknown name) won't change on retry — drop it but keep the draft.
        if (e instanceof SaveError && !/replied \d+/.test(e.message)) left = left.filter((x) => x !== item);
        lastError = e instanceof Error ? e.message : "Couldn't reach the answer sheet.";
      }
    }
    write(K_PENDING, left);
    setPending(left);
    sending.current = false;
    if (lastError) setSync({ kind: "error", message: lastError });
    void refresh();
  }, [canSave, player, refresh]);

  // Retry the outbox on load, when the connection comes back, and every 30 s while something is waiting.
  useEffect(() => {
    if (!ready) return;
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [ready, flush]);
  useEffect(() => {
    if (!pending.length) return;
    const t = setInterval(() => void flush(), 30_000);
    return () => clearInterval(t);
  }, [pending.length, flush]);

  const choosePlayer = useCallback((p: string) => {
    write(K_PLAYER, p);
    setPlayer(p);
    setDrafts(read(kDrafts(p), {}));
    setMine(read(kMine(p), {}));
  }, []);

  const forgetPlayer = useCallback(() => {
    write(K_PLAYER, null);
    setPlayer(null);
  }, []);

  const setAnswer = useCallback(
    (stage: string, qid: string, value: string) => {
      if (!player) return;
      setDrafts((cur) => {
        const next = { ...cur, [stage]: { ...cur[stage], [qid]: value } };
        write(kDrafts(player), next);
        return next;
      });
    },
    [player],
  );

  /** Queue the stage for saving (kept on this phone until the sheet confirms), then send it. */
  const submit = useCallback(
    async (stage: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!player) return { ok: false, message: "Choose your name first." };
      if (!canSave) return { ok: false, message: "Saving isn't set up yet." };
      const item: Pending = { player, stage, answers: drafts[stage] ?? {}, queuedAt: new Date().toISOString() };
      const queue = [...read<Pending[]>(K_PENDING, []).filter((x) => !(x.player === player && x.stage === stage)), item];
      write(K_PENDING, queue);
      setPending(queue);
      try {
        const saved = await submitAnswers(league.sheetUrl, player, stage, item.answers);
        const left = read<Pending[]>(K_PENDING, []).filter((x) => !(x.player === player && x.stage === stage));
        write(K_PENDING, left);
        setPending(left);
        setMine((cur) => {
          const next = { ...cur, [stage]: saved };
          write(kMine(player), next);
          return next;
        });
        void refresh();
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Couldn't reach the answer sheet.";
        const definitive = e instanceof SaveError && !/replied \d+/.test(message);
        if (definitive) {
          const left = read<Pending[]>(K_PENDING, []).filter((x) => !(x.player === player && x.stage === stage));
          write(K_PENDING, left);
          setPending(left);
        }
        return { ok: false, message: definitive ? message : "No connection to the answer sheet. Your answers are kept on this phone and will be sent automatically." };
      }
    },
    [player, canSave, drafts, refresh],
  );

  /** Everything known: the sheet, plus our own saves in case the sheet hasn't been re-read yet. */
  const submissions = useMemo(() => {
    const all = [...remote];
    for (const s of Object.values(mine)) {
      const i = all.findIndex((x) => x.player === s.player && x.stage === s.stage);
      if (i === -1) all.push(s);
      else if (!all[i].answers) all[i] = s;
    }
    return all;
  }, [remote, mine]);

  const isPending = (stage: string) => !!player && pending.some((x) => x.player === player && x.stage === stage);

  return { ready, league, player, choosePlayer, forgetPlayer, drafts, setAnswer, submit, submissions, mine, isPending, sync, refresh, canSave };
}
