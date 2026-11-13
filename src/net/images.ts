// CRC: crc-ImageExchange.md | Seq: seq-images.md#1.2, seq-images.md#1.3, seq-images.md#1.4, seq-images.md#1.5, seq-images.md#2 | R194, R195
// Images peer to peer: the bytes stay in each page's BlobStore, named by their hash. A page missing
// one asks the table; the first answer that hashes right is kept, so this page can answer the next
// asker. The GM's page has every image it has seen.

import type { Game } from '../model/game.ts';
import type { Image } from '../model/records.ts';
import type { BlobStore } from '../store/blobs.ts';
import type { Clock } from '../store/gamestore.ts';
import type { Net } from './link.ts';

export const RETRY_MS = 10_000;
/** Why an image shows striped (R195). */
export const NOBODY = 'Nobody at the table has sent this image yet (the page that has it may be closed); trying again';

export class ImageExchange {
  /** Hashes shown on the table but not in the BlobStore, with why. */
  missing = new Map<string, string>();
  #changed: ((hash: string) => void)[] = [];
  #net: Net;
  #blobs: BlobStore;
  #clock: Clock;
  #asking = new Map<string, Promise<boolean>>();
  #tick: unknown = null;

  constructor(net: Net, blobs: BlobStore, clock: Clock) {
    this.#net = net;
    this.#blobs = blobs;
    this.#clock = clock;
    // Seq: seq-images.md#1.4: this page answers with what it has.
    net.answer(hash => blobs.get(hash));
  }

  // R195: whoever draws images hears when one arrives or is found missing.
  /** Calls `fn` with a hash whenever that image arrives or is found missing. */
  changed(fn: (hash: string) => void): void { this.#changed.push(fn); }

  #mark(hash: string, why: string | undefined): void {
    const was = this.missing.get(hash);
    if (why) this.missing.set(hash, why); else this.missing.delete(hash);
    if (was !== why || !why) for (const fn of this.#changed) fn(hash);
  }

  // Seq: seq-images.md#1.2 to seq-images.md#1.5 | R194
  /** Makes sure this page has the image: true once it does. */
  want(hash: string): Promise<boolean> {
    let asking = this.#asking.get(hash);
    if (!asking) {
      asking = (async () => {
        if (!await this.#blobs.get(hash)) {
          const blob = await this.#net.request(hash);
          if (!blob || !await this.#blobs.accept(hash, blob)) { this.#mark(hash, NOBODY); return false; }
        }
        this.#mark(hash, undefined);
        return true;
      })().finally(() => this.#asking.delete(hash));
      this.#asking.set(hash, asking);
    }
    return asking;
  }

  /** Every image the game shows is wanted, as it arrives. */
  watch(game: Game): void {
    const check = (rids: Iterable<string>) => {
      for (const rid of rids) {
        const r = game.get(rid) as Image | undefined;
        if (r && 'kind' in r && r.kind === 'image') void this.want(r.blob);
      }
    };
    game.listen(check);
    check(game.all().map(([rid]) => rid));
  }

  // Seq: seq-images.md#2 | R195: asked again every 10 s until a page with it is back.
  start(): void {
    const tick = () => {
      for (const hash of this.missing.keys()) void this.want(hash);
      this.#tick = this.#clock.setTimeout(tick, RETRY_MS);
    };
    this.#tick = this.#clock.setTimeout(tick, RETRY_MS);
  }

  stop(): void {
    if (this.#tick !== null) this.#clock.clearTimeout(this.#tick);
    this.#tick = null;
  }
}
