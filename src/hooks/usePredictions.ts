"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionError, InvalidFileError, blankData } from "@/lib/state";
import {
  createLinked, downloadJson, hasPermission, loadBundled, loadLocal, openLinked, readLinked, readUpload,
  recallHandle, rememberHandle, saveLocal, writeLinked, type LinkedFile,
} from "@/lib/storage";
import type { AppData } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type FileState =
  | { kind: "none" }
  | { kind: "linked"; name: string }
  | { kind: "reconnect"; name: string }; // remembered from last visit, needs a click to re-grant access

export function usePredictions(notify: (msg: string) => void) {
  const [data, setData] = useState<AppData | null>(null);
  const [file, setFile] = useState<FileState>({ kind: "none" });
  // Bumped whenever a whole file is loaded, so forms holding drafts start fresh.
  const [revision, setRevision] = useState(0);
  const handle = useRef<LinkedFile | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const writeFile = useCallback(
    (d: AppData) => {
      const h = handle.current;
      if (!h) return;
      writes.current = writes.current.then(() =>
        writeLinked(h, d).catch(() => {
          handle.current = null;
          setFile({ kind: "reconnect", name: h.name });
          notify("Couldn't write to the linked file — your picks are still saved in this browser.");
        }),
      );
    },
    [notify],
  );

  // First load: browser copy → bundled /data.json → fresh file. Then look for a remembered linked file.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = loadLocal() ?? (await loadBundled(BASE)) ?? blankData();
      if (cancelled) return;
      setData(d);
      const h = await recallHandle();
      if (!h || cancelled) return;
      if (await hasPermission(h, false)) {
        handle.current = h;
        setFile({ kind: "linked", name: h.name });
      } else {
        handle.current = null;
        setFile({ kind: "reconnect", name: h.name });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(
    (next: AppData) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      setData(stamped);
      saveLocal(stamped);
      writeFile(stamped);
    },
    [writeFile],
  );

  /** Apply a change from lib/state. Validation errors become a toast instead of a crash. */
  const update = useCallback(
    (fn: (d: AppData) => AppData): boolean => {
      if (!data) return false;
      try {
        const next = fn(data);
        if (next !== data) commit(next);
        return true;
      } catch (e) {
        if (e instanceof ActionError) {
          notify(e.message);
          return false;
        }
        throw e;
      }
    },
    [data, commit, notify],
  );

  const replaceAll = useCallback(
    (d: AppData) => {
      commit(d);
      setRevision((r) => r + 1);
    },
    [commit],
  );

  const link = useCallback(
    async (h: LinkedFile, d: AppData, isNewData: boolean) => {
      handle.current = h;
      await rememberHandle(h);
      setFile({ kind: "linked", name: h.name });
      if (isNewData) replaceAll(d);
      else commit(d);
    },
    [commit, replaceAll],
  );

  const createFile = useCallback(async () => {
    if (!data) return;
    const h = await createLinked("spelione-predictions.json");
    if (!h) return;
    await link(h, data, false);
    notify(`Saving to ${h.name}`);
  }, [data, link, notify]);

  const openFile = useCallback(async () => {
    const h = await openLinked();
    if (!h) return;
    try {
      const d = await readLinked(h);
      if (!(await hasPermission(h, true))) return notify("The browser didn't allow saving to that file.");
      await link(h, d, true);
      notify(`Opened ${h.name}`);
    } catch (e) {
      notify(e instanceof InvalidFileError ? e.message : "That file couldn't be read.");
    }
  }, [link, notify]);

  const reconnect = useCallback(async () => {
    const h = await recallHandle();
    if (!h) return setFile({ kind: "none" });
    try {
      if (!(await hasPermission(h, true))) return;
      const d = await readLinked(h);
      await link(h, d, true);
      notify(`Reconnected to ${h.name}`);
    } catch {
      notify("That file has moved or can't be read — open it again from the Data tab.");
    }
  }, [link, notify]);

  const unlink = useCallback(async () => {
    handle.current = null;
    await rememberHandle(null);
    setFile({ kind: "none" });
  }, []);

  const importUpload = useCallback(
    async (f: File) => {
      try {
        replaceAll(await readUpload(f));
        notify(`Loaded ${f.name}`);
      } catch (e) {
        notify(e instanceof InvalidFileError ? e.message : "That file couldn't be read.");
      }
    },
    [replaceAll, notify],
  );

  const download = useCallback(() => data && downloadJson(data), [data]);
  const reset = useCallback(() => replaceAll(blankData()), [replaceAll]);

  return { data, file, revision, update, createFile, openFile, reconnect, unlink, importUpload, download, reset };
}

/** Current time, refreshed every minute, so games lock on their own at tip-off. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
