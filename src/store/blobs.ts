// CRC: crc-BlobStore.md | R26, R130, R194
// Image bytes by content. The SHA-256 of the bytes is the image's name in the game, its key here,
// and what the table asks for; records never hold the bytes.

import type { Db } from './db.ts';

export type Size = { w: number; h: number };
/** Decodes an image's size: the page's uses createImageBitmap; a test fakes it. */
export type Measure = (blob: Blob) => Promise<Size>;
export type Urls = { create(blob: Blob): string; revoke(url: string): void };

export async function sha256(bytes: Blob | ArrayBuffer | Uint8Array): Promise<string> {
  const buf = bytes instanceof Blob ? await bytes.arrayBuffer() : bytes;
  const digest = await crypto.subtle.digest('SHA-256', buf as BufferSource);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export class BlobStore {
  #db: Db;
  #measure: Measure;
  #urls: Urls;
  #shown = new Map<string, { url: string; n: number }>();

  constructor(db: Db, measure: Measure, urls: Urls = { create: b => URL.createObjectURL(b), revoke: u => URL.revokeObjectURL(u) }) {
    this.#db = db;
    this.#measure = measure;
    this.#urls = urls;
  }

  // R26: an image from the supply belongs to the game by its hash.
  /** Stores a file and gives what an Image record needs. */
  async add(file: Blob): Promise<{ blob: string } & Size> {
    const blob = await sha256(file), size = await this.#measure(file);
    await this.#db.tx(['blobs'], 'readwrite', t => t.put('blobs', blob, file));
    return { blob, ...size };
  }

  get(hash: string): Promise<Blob | undefined> {
    return this.#db.tx(['blobs'], 'readonly', t => t.get<Blob>('blobs', hash));
  }

  // R194: bytes from another page are kept only if they hash to the name asked for.
  /** Keeps bytes another page (or an import) sent, if they are what `hash` names. */
  async accept(hash: string, bytes: Blob): Promise<boolean> {
    if (await sha256(bytes) !== hash) return false;
    await this.#db.tx(['blobs'], 'readwrite', t => t.put('blobs', hash, bytes));
    return true;
  }

  /** An object URL for showing the image; each url() is paired with a release(). */
  async url(hash: string): Promise<string | undefined> {
    const shown = this.#shown.get(hash);
    if (shown) { shown.n++; return shown.url; }
    const blob = await this.get(hash);
    if (!blob) return undefined;
    const again = this.#shown.get(hash);  // another url() may have finished while this one read
    if (again) { again.n++; return again.url; }
    const url = this.#urls.create(blob);
    this.#shown.set(hash, { url, n: 1 });
    return url;
  }

  /** One image stops showing; the URL is revoked when none does. */
  release(hash: string): void {
    const shown = this.#shown.get(hash);
    if (!shown || --shown.n > 0) return;
    this.#urls.revoke(shown.url);
    this.#shown.delete(hash);
  }
}
