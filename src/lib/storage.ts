/**
 * Browser-side persistence. Data is always mirrored to localStorage, and can
 * also be written to a JSON file on the user's computer via the File System
 * Access API (Chrome, Edge, Opera). The file handle is kept in IndexedDB so the
 * link survives page reloads.
 */
import { parseData, serialize } from "./state.ts";
import type { AppData } from "./types.ts";

const LS_KEY = "fco-spelione-v1";
const DB = "fco-spelione";
const STORE = "handles";
const HANDLE_KEY = "linked-file";
const JSON_TYPES = [{ description: "JSON", accept: { "application/json": [".json"] } }];

/* Minimal typings for the parts of the File System Access API we use. */
interface WritableFile { write(data: string): Promise<void>; close(): Promise<void> }
export interface LinkedFile {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFile>;
  queryPermission?(o: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(o: { mode: "readwrite" }): Promise<PermissionState>;
}
type PickerWindow = Window & {
  showSaveFilePicker?: (o: object) => Promise<LinkedFile>;
  showOpenFilePicker?: (o: object) => Promise<LinkedFile[]>;
};

export const supportsLinkedFiles = (): boolean => typeof window !== "undefined" && "showSaveFilePicker" in window;

export function loadLocal(): AppData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? parseData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLocal(data: AppData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked — the linked file (if any) still gets written */
  }
}

/** Optional starter file shipped with the site at /data.json. */
export async function loadBundled(basePath: string): Promise<AppData | null> {
  try {
    const r = await fetch(`${basePath}/data.json`, { cache: "no-store" });
    return r.ok ? parseData(await r.json()) : null;
  } catch {
    return null;
  }
}

/* ---------- IndexedDB for the file handle ---------- */

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(undefined);
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => resolve(undefined);
    open.onsuccess = () => {
      try {
        const req = fn(open.result.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    };
  });
}

export const rememberHandle = (h: LinkedFile | null) =>
  idb<unknown>("readwrite", (s) => (h ? s.put(h, HANDLE_KEY) : s.delete(HANDLE_KEY)));
export const recallHandle = () => idb<LinkedFile>("readonly", (s) => s.get(HANDLE_KEY));

/* ---------- linked JSON file ---------- */

export async function hasPermission(h: LinkedFile, ask: boolean): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  if ((await h.queryPermission?.(opts)) === "granted") return true;
  return ask ? (await h.requestPermission?.(opts)) === "granted" : false;
}

export async function writeLinked(h: LinkedFile, data: AppData): Promise<void> {
  const w = await h.createWritable();
  await w.write(serialize(data));
  await w.close();
}

export async function readLinked(h: LinkedFile): Promise<AppData> {
  return parseData(JSON.parse(await (await h.getFile()).text()));
}

/** Ask where to save a new JSON file. Returns null if the user cancels. */
export async function createLinked(suggestedName: string): Promise<LinkedFile | null> {
  try {
    return (await (window as PickerWindow).showSaveFilePicker?.({ suggestedName, types: JSON_TYPES })) ?? null;
  } catch {
    return null;
  }
}

/** Ask for an existing JSON file to open and keep saving to. Returns null if the user cancels. */
export async function openLinked(): Promise<LinkedFile | null> {
  try {
    const [h] = (await (window as PickerWindow).showOpenFilePicker?.({ types: JSON_TYPES })) ?? [];
    return h ?? null;
  } catch {
    return null;
  }
}

/* ---------- plain download / upload (works in every browser) ---------- */

export function downloadJson(data: AppData): void {
  const url = URL.createObjectURL(new Blob([serialize(data)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `spelione-predictions-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readUpload(file: File): Promise<AppData> {
  return parseData(JSON.parse(await file.text()));
}
