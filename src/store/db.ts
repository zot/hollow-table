// CRC: crc-Db.md | Seq: seq-save.md#1.5.1 | R130
// A small interface over the browser's database, so the store is tested without a browser.
// MemoryDb is the test's; IdbDb is the page's, over IndexedDB (database `hollow-table`).

export const STORES = ['games', 'records', 'checkpoints', 'blobs'] as const;
export type StoreName = (typeof STORES)[number];
/** A key: a string, or `[game, id]` for the stores kept per game. */
export type Key = string | [string, string];
export type Mode = 'readonly' | 'readwrite';

/** What a transaction can do. `prefix` picks the `[prefix, …]` keys of a per-game store. */
export interface Tx {
  get<T>(store: StoreName, key: Key): Promise<T | undefined>;
  put(store: StoreName, key: Key, value: unknown): Promise<void>;
  del(store: StoreName, key: Key): Promise<void>;
  all<T>(store: StoreName, prefix?: string): Promise<[Key, T][]>;
}

export interface Db {
  /** One transaction: everything `fn` does lands together, or nothing does if it throws. */
  tx<T>(stores: StoreName[], mode: Mode, fn: (t: Tx) => Promise<T>): Promise<T>;
}

const encode = (k: Key): string => typeof k === 'string' ? k : `${k[0]}\u0000${k[1]}`;
const inPrefix = (k: Key, prefix?: string) => prefix === undefined || (typeof k !== 'string' && k[0] === prefix);

/** What one committed MemoryDb transaction wrote, for tests that count writes. */
export type Written = { stores: StoreName[]; puts: string[]; dels: string[] };

/** The database in memory, with IndexedDB's semantics: transactions run one at a time and land whole. */
export class MemoryDb implements Db {
  #data = new Map<StoreName, Map<string, [Key, unknown]>>(STORES.map(s => [s, new Map()]));
  #queue: Promise<unknown> = Promise.resolve();
  /** Every transaction that wrote something, in order. */
  log: Written[] = [];

  tx<T>(stores: StoreName[], mode: Mode, fn: (t: Tx) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const work = new Map(stores.map(s => [s, new Map(this.#data.get(s))]));
      const written: Written = { stores, puts: [], dels: [] };
      const store = (s: StoreName) => {
        const m = work.get(s);
        if (!m) throw new Error(`store ${s} is not in this transaction`);
        return m;
      };
      const writable = () => { if (mode !== 'readwrite') throw new Error('readonly transaction'); };
      const t: Tx = {
        get: async <V>(s: StoreName, k: Key) => store(s).get(encode(k))?.[1] as V | undefined,
        put: async (s, k, v) => { writable(); store(s).set(encode(k), [k, v]); written.puts.push(`${s}:${encode(k)}`); },
        del: async (s, k) => { writable(); store(s).delete(encode(k)); written.dels.push(`${s}:${encode(k)}`); },
        all: async <V>(s: StoreName, prefix?: string) =>
          [...store(s).values()].filter(([k]) => inPrefix(k, prefix)) as [Key, V][],
      };
      const result = await fn(t);
      for (const [s, m] of work) this.#data.set(s, m);
      if (written.puts.length || written.dels.length) this.log.push(written);
      return result;
    };
    const next = this.#queue.then(run, run);
    this.#queue = next.catch(() => undefined);
    return next;
  }
}

const done = <T>(r: IDBRequest<T>): Promise<T> => new Promise((ok, fail) => {
  r.onsuccess = () => ok(r.result);
  r.onerror = () => fail(r.error);
});

/** The page's database: IndexedDB `hollow-table`, one object store per StoreName, keys out of line. */
export class IdbDb implements Db {
  #db: IDBDatabase;
  private constructor(db: IDBDatabase) { this.#db = db; }

  static async open(name = 'hollow-table'): Promise<IdbDb> {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); };
    return new IdbDb(await done(req));
  }

  tx<T>(stores: StoreName[], mode: Mode, fn: (t: Tx) => Promise<T>): Promise<T> {
    const x = this.#db.transaction(stores, mode);
    const landed = new Promise<void>((ok, fail) => {
      x.oncomplete = () => ok();
      x.onerror = () => fail(x.error);
      x.onabort = () => fail(x.error ?? new Error('transaction aborted'));
    });
    const range = (prefix?: string) => prefix === undefined ? undefined : IDBKeyRange.bound([prefix], [prefix, []]);
    const t: Tx = {
      get: async <V>(s: StoreName, k: Key) => await done(x.objectStore(s).get(k)) as V | undefined,
      put: async (s, k, v) => { await done(x.objectStore(s).put(v, k)); },
      del: async (s, k) => { await done(x.objectStore(s).delete(k)); },
      all: async <V>(s: StoreName, prefix?: string) => {
        const store = x.objectStore(s), r = range(prefix);
        const [keys, values] = await Promise.all([done(store.getAllKeys(r)), done(store.getAll(r))]);
        return keys.map((k, i): [Key, V] => [k as Key, values[i] as V]);
      },
    };
    return (async () => {
      let result: T;
      try {
        result = await fn(t);
      } catch (e) {
        landed.catch(() => undefined);  // the abort rejects it; the caller hears `e` instead
        try { x.abort(); } catch { /* already finished */ }
        throw e;
      }
      await landed;
      return result;
    })();
  }
}
