/**
 * Browser-side store for cropped PDF visuals.
 *
 * Exam JSON only ever carries an "asset:<id>" reference, so a paper with 60
 * diagrams stays a small document. The bytes live in IndexedDB, survive a
 * refresh, and are handed to the UI as object URLs.
 */

const DB_NAME = "mockforge-assets";
const STORE = "assets";
const PREFIX = "asset:";

const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const request = run(db.transaction(STORE, mode).objectStore(STORE));
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

function newAssetId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
    : Math.random().toString(36).slice(2, 18);
}

export const isAssetRef = (url: string | null | undefined): url is string =>
  typeof url === "string" && url.startsWith(PREFIX);

export const assetStore = {
  /** Stores a data URL and returns the "asset:<id>" reference to put in the exam JSON. */
  async put(dataUrl: string, id = newAssetId()): Promise<string> {
    await tx("readwrite", (store) => store.put(dataUrl, id));
    return `${PREFIX}${id}`;
  },

  async getDataUrl(ref: string): Promise<string | null> {
    if (!isAssetRef(ref)) return ref || null;
    const value = await tx<string>("readonly", (store) => store.get(ref.slice(PREFIX.length)));
    return typeof value === "string" ? value : null;
  },

  /** Resolves any media url to something an <img> can render. */
  async resolve(url: string | null): Promise<string | null> {
    if (!url) return null;
    if (!isAssetRef(url)) return url;
    const cached = urlCache.get(url);
    if (cached) return cached;
    const inFlight = pending.get(url);
    if (inFlight) return inFlight;

    const task = (async () => {
      const dataUrl = await assetStore.getDataUrl(url);
      if (!dataUrl) return null;
      urlCache.set(url, dataUrl);
      return dataUrl;
    })();
    pending.set(url, task);
    const result = await task;
    pending.delete(url);
    return result;
  },
};
