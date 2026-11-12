// CRC: crc-Exchange.md | R138, R139
// Export and import: a game as one readable file holding its records, its checkpoints and each image
// once. An import is checked whole before anything is written, and always makes a new game.

import { check, type Rec, type Rid } from '../model/records.ts';
import { sha256, type BlobStore } from './blobs.ts';
import type { Checkpoint, GameInfo, GameStore } from './gamestore.ts';

export const FORMAT = 'hollow-table-game';
export const VERSION = 1;

type FileCheckpoint = Omit<Checkpoint, 'id'>;
export type GameFile = {
  format: typeof FORMAT; version: number; name: string; records: Record<Rid, Rec>;
  checkpoints: FileCheckpoint[]; blobs: Record<string, string>;
};

/** Every image hash the records use, burials included. */
function imagesIn(records: Iterable<Rec>, into = new Set<string>()): Set<string> {
  for (const r of records) {
    if ('kind' in r && r.kind === 'image') into.add(r.blob);
    if ('yards' in r) for (const g of r.yards) for (const b of g.items) imagesIn(b.records, into);
  }
  return into;
}

async function toDataUri(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

function fromDataUri(uri: string): Blob | null {
  const m = /^data:([^;,]*);base64,([A-Za-z0-9+/=]*)$/.exec(uri);
  if (!m) return null;
  const bin = atob(m[2]!);
  return new Blob([Uint8Array.from(bin, c => c.charCodeAt(0))], { type: m[1] });
}

// R138: one readable `.glimmer.json`: the game, its checkpoints, each image once.
/** The file for a game, and the name to save it under. */
export async function exportGame(store: GameStore, blobs: BlobStore, id: string): Promise<{ filename: string; text: string }> {
  const { info, records, checkpoints } = await store.read(id);
  const used = imagesIn(records.map(([, r]) => r));
  for (const cp of checkpoints) imagesIn(Object.values(cp.records), used);
  const images: Record<string, string> = {};
  for (const hash of used) {
    const blob = await blobs.get(hash);
    if (blob) images[hash] = await toDataUri(blob);
  }
  const file: GameFile = {
    format: FORMAT, version: VERSION, name: info.name, records: Object.fromEntries(records),
    checkpoints: checkpoints.map(({ id: _, ...cp }) => cp), blobs: images,
  };
  return { filename: fileName(info.name), text: JSON.stringify(file, null, 2) };
}

/** An import refused whole, with why. */
// R292: the file is named after the game, punctuation and spaces as dashes.
/** The export's file name for a game called `name`. */
export function fileName(name: string): string {
  return `${name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'game'}.glimmer.json`;
}

export class BadFile extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function records(v: unknown, where: string): [Rid, Rec][] {
  if (!isObject(v)) throw new BadFile(`${where}: no records`);
  return Object.entries(v).map(([rid, rec]) => {
    if (!check(rid, rec)) throw new BadFile(`${where}: ${rid} is not a well-formed record`);
    return [rid, rec];
  });
}

// R139: an import always makes a new game, and nothing half-imports.
/** Checks the whole file, then stores it as a new game, adding "(imported)" to a name already taken. */
export async function importGame(store: GameStore, blobs: BlobStore, text: string): Promise<GameInfo> {
  let file: unknown;
  try { file = JSON.parse(text); } catch { throw new BadFile('not JSON'); }
  if (!isObject(file) || file.format !== FORMAT) throw new BadFile('not a Hollow Table game');
  if (file.version !== VERSION) throw new BadFile(`version ${String(file.version)} is not ${VERSION}`);
  if (typeof file.name !== 'string' || !file.name) throw new BadFile('no name');
  const game = records(file.records, 'the game');
  if (!Array.isArray(file.checkpoints)) throw new BadFile('no checkpoints');
  const checkpoints = file.checkpoints.map((cp: unknown, i): FileCheckpoint => {
    if (!isObject(cp) || typeof cp.name !== 'string' || typeof cp.at !== 'number' || typeof cp.auto !== 'boolean') {
      throw new BadFile(`checkpoint ${i + 1} is malformed`);
    }
    return { name: cp.name, at: cp.at, auto: cp.auto, records: Object.fromEntries(records(cp.records, `checkpoint “${cp.name}”`)) };
  });
  if (!isObject(file.blobs)) throw new BadFile('no images');
  const images: [string, Blob][] = [];
  for (const [hash, uri] of Object.entries(file.blobs)) {
    const blob = typeof uri === 'string' ? fromDataUri(uri) : null;
    if (!blob || await sha256(blob) !== hash) throw new BadFile(`image ${hash.slice(0, 12)}… is not what its name says`);
    images.push([hash, blob]);
  }

  const taken = new Set((await store.list()).map(g => g.name));
  const name = taken.has(file.name) ? `${file.name} (imported)` : file.name;
  for (const [hash, blob] of images) await blobs.accept(hash, blob);
  return store.add(name, game, checkpoints);
}
