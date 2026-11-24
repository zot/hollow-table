// CRC: crc-Build.md | R196, R201, R476, R483, R486, R487
// The page's entry point: the store, this browser's identity, and, at a table, the network. The
// plain page is the GM's and opens a table on demand; an invite makes a player, who joins with a
// copy of the GM's table. The views attach here as they land. With `?test` the page exposes one
// object, `window.hollow`, for Playwright, and nothing otherwise.

import { Game } from './model/game.ts';
import { GM, isLocal, onTable, ridFor, ridOf, type Book, type Desk, type OldDesk, type Character, type Hill, type Connections, type Image, type Opinion, type Meta, type Oid, type PieceRecord, type Receipt, type Rid, type Yards } from './model/records.ts';
import { COLUMN_OF, pages } from './rules/absorb.ts';
import { buryInfo, buryRecord, empty as emptyYards, ownTorn, raised } from './rules/yards.ts';
import { repin } from './rules/dockets.ts';
import { setOut } from './rules/desktops.ts';
import { desksOf, takeOut } from './rules/drawers.ts';
import { first, groupOf, keep as keepRow, nameOf, newConnections, pcsOf, published, rowOf, synced, tableOf } from './rules/connections.ts';
import { placeOf, type Taking } from './ui/piece.ts';
import { Authority } from './net/authority.ts';
import { Copy } from './net/copy.ts';
import { Identity } from './net/identity.ts';
import { ImageExchange } from './net/images.ts';
import { Moves, type Command, type Move } from './net/moves.ts';
import { Presence, fromUrl, invite, newRoom } from './net/presence.ts';
import { Rolls } from './net/rolls.ts';
import { Sealer } from './net/seal.ts';
import { Stamps } from './net/stamps.ts';
import { Wire } from './net/wire.ts';
import { mayTap } from './rules/tap.ts';
import { click, shiftClick } from './rules/ownership.ts';
import { TrayView } from './ui/tray.ts';
import { markOlder } from './ui/pens.ts';
import { RollRowView, intentOf } from './ui/rollrow.ts';
import { Eyes } from './ui/eyes.ts';
import { TapeView } from './ui/tape.ts';
import { RegisterView } from './ui/register.ts';
import { BarView, type Supply } from './ui/bar.ts';
import type { Mode } from './ui/desk.ts';
import type { PointerLike } from './ui/gesture.ts';
import { BootHillView, isPageUndo } from './ui/boothill.ts';
import { FolksView, arrivalName, gmName, viewAsChoices, type Here, type Me } from './ui/folks.ts';
import { newCharacter, newChip, newDocket, newHowTo, newSticky, newText } from './rules/supplies.ts';
import { handOver, oldClaims } from './net/claims.ts';
import { redact, type Viewer } from './rules/visibility.ts';
import { BlobStore, type Size } from './store/blobs.ts';
import { IdbDb } from './store/db.ts';
import { GameStore, type Clock, type KeyValue } from './store/gamestore.ts';
import { load as loadSeat, prune as pruneSeat, save as saveSeat, type Seat } from './store/seat.ts';
import { exportGame, importGame } from './store/exchange.ts';
import { LedgerView, type LedgerWith } from './ui/ledger.ts';
import { minter } from './ui/actions.ts';
import { Drag } from './ui/drag.ts';
import { Hands } from './ui/hands.ts';
import { TableView } from './ui/table.ts';

declare const HOLLOW_VERSION: string, HOLLOW_DATE: string;

const clock: Clock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: h => clearTimeout(h as number) };

async function measure(blob: Blob): Promise<Size> {
  const image = await createImageBitmap(blob);
  const size = { w: image.width, h: image.height };
  image.close();
  return size;
}

/** This tab's id: new for each tab, kept across its reloads. */
function tabId(session: KeyValue): string {
  let tab = null;
  try { tab = session.getItem('hollow.tab'); } catch { /* blocked */ }
  if (!tab) {
    tab = `t-${[...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('')}`;
    try { session.setItem('hollow.tab', tab); } catch { /* this load only */ }
  }
  return tab;
}

/** A localStorage value, set first when given; null when storage is blocked. */
function local(key: string, value?: string): string | null {
  try { if (value !== undefined) localStorage.setItem(key, value); return localStorage.getItem(key); } catch { return null; }
}

/** A sessionStorage value (this tab's), set first when given; null when storage is blocked. */
function session(key: string, value?: string): string | null {
  try { if (value !== undefined) sessionStorage.setItem(key, value); return sessionStorage.getItem(key); } catch { return null; }
}

/** The move actor's next pass: the next animation frame, or 100 ms, whichever comes first (a hidden tab gets no frames). */
function frame(fn: () => void): void {
  let done = false, raf = 0;
  const go = () => { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(t); fn(); };
  raf = requestAnimationFrame(go);
  const t = setTimeout(go, 100);
}

/** The table's views for this page: drawn from the game, the view kept in this viewer's seat. */
// Seq: seq-move.md#1.4, seq-move.md#2.1 | R298, R300: a pass's winners, shown in their hands (only
// those `may` allows), and what was let go.
function shown(hands: Hands | undefined, cs: Command[], may: (c: Command) => boolean = () => true): void {
  const by = new Map<string, { moved: Command[]; dropped: Command[] }>();
  for (const c of cs) {
    if (!may(c)) continue;
    const g = by.get(c.tab) ?? { moved: [], dropped: [] };
    (c.drop ? g.dropped : g.moved).push(c);
    by.set(c.tab, g);
  }
  for (const [tab, g] of by) {
    if (g.moved.length) hands?.show(tab, g.moved, false);
    if (g.dropped.length) hands?.drop(tab, g.dropped, false);
  }
}

function views(game: Game, gameId: string, viewer: Viewer, blobs: BlobStore, moves: Moves, hand: string, missing: (hash: string) => string | undefined, ledger: LedgerWith,
  rolling: () => Rolls, checkpoint?: (name: string) => Promise<unknown>): { table: TableView; drag: Drag; bar: BarView; hands: Hands } {
  const who = viewer?.name ?? 'nobody', gm = !!viewer?.gm;
  let seat: Seat = loadSeat(localStorage, gameId, who);
  const keep = (s: Seat) => { seat = s; saveSeat(localStorage, gameId, who, s); };
  const redraw = () => table.render(game.all().map(([rid]) => rid));
  const mint = () => minter(game, gm);
  let drag: Drag | undefined, rollRow: RollRowView | undefined;
  // R392, R388: the GM's open eyes, this page's own; a change redraws the card and every Roll key.
  const eyes = new Eyes(game, oid => { table.render([ridOf(oid)]); rollRow?.render(); });
  // R401, R404: slides one Info card out of its NPC's card, the rest of that card's tucked back.
  const slideInfo = (oid: Oid, k: number | string) => {
    const mine = `${oid}:`;
    keep({ ...seat, open: { ...seat.open, info: [...seat.open.info.filter(s => !s.startsWith(mine)), mine + k] } });
    redraw();
  };
  // Seq: seq-take.md#1, seq-take.md#1.1, seq-take.md#1.2, seq-take.md#1.3, seq-take.md#1.4 | R308–R312
  // An Attack being taken on this page: its pages on the target's card, which turns to its back with
  // the Attack's column in front. Escape or a click off the card backs out (a pan doesn't); nothing is saved.
  let taking: Taking | null = null;
  const cancelTake = () => {
    if (!taking) return;
    taking = null;
    removeEventListener('keydown', onTakeKey, true);
    removeEventListener('pointerdown', onTakePress, true);
    removeEventListener('pointerup', onTakeUp, true);
    redraw();
  };
  const onTakeKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelTake(); };
  let pressedOff: { x: number; y: number } | null = null;
  const onTakePress = (e: PointerEvent) => {
    const card = taking && document.querySelector(`.obj.card[data-rid="${ridOf(taking.oid)}"]`);
    pressedOff = card && !card.contains(e.target as Node) ? { x: e.clientX, y: e.clientY } : null;
  };
  const onTakeUp = (e: PointerEvent) => {
    if (pressedOff && Math.hypot(e.clientX - pressedOff.x, e.clientY - pressedOff.y) < 5) cancelTake();
    pressedOff = null;
  };
  const startTake = (r: Receipt) => {
    const a = r.attack, c = a && game.get(ridOf(a.target)) as Character | undefined;
    if (!a || c?.kind !== 'character') return;
    cancelTake();
    taking = { oid: c.oid, id: r.id, kind: a.kind, by: a.from, result: a.result, pages: pages(c, a.kind, a.result), k: 0 };
    const col = `${c.oid}:${COLUMN_OF[a.kind]}`;
    keep({ ...seat, open: { ...seat.open, columns: [...seat.open.columns.filter(k => !k.startsWith(`${c.oid}:`)), col] } });
    if (!c.flipped) game.change(w => w.put(ridOf(c.oid), { ...c, flipped: true }));
    addEventListener('keydown', onTakeKey, true);
    addEventListener('pointerdown', onTakePress, true);
    addEventListener('pointerup', onTakeUp, true);
    redraw();
  };
  /** The height that puts a piece on top of everything. */
  const topZ = () => 1 + Math.max(0, ...game.all().map(([, r]) => ('kind' in r ? placeOf(r as PieceRecord) : null)?.z ?? 0));
  // R498: paper made on this page records its maker.
  const maker = viewer?.gm ? GM : viewer?.name;
  // R272, R515: an image's bytes kept, and an Image put on top where it goes; its rid, once it is.
  // R517: an image the browser won't keep is said on the image pigeonhole, until one is added.
  const addImage = (file: File, at: { x: number; y: number }): Promise<string | undefined> => blobs.add(file).then(({ blob, w: iw, h }) => {
    const oid = mint()();
    const image: Image = { kind: 'image', oid, place: { ...at, z: topZ(), tilt: 0 }, blob, w: iw, h, ...(maker && { by: maker }) };   // R498
    game.change(wr => wr.put(ridOf(oid), image));
    bar.refused(null);
    return ridOf(oid);
  }, (e: unknown) => {
    const full = (e as { name?: string })?.name === 'QuotaExceededError', said = e instanceof Error ? e.message : String(e);
    bar.refused(full ? { label: 'storage full', why: `${file.name} not added: this browser's storage is full (${said})` }
      : { label: 'not added', why: `${file.name} not added: ${said}` });
    return undefined;
  });
  // R19, R512, R34: a supply is made at the pointer and carried; a new character's pool pops out
  // above its card.
  const made = (what: Exclude<Supply, 'connections'>, oid: string, at: { x: number; y: number }): PieceRecord => {
    switch (what) {
      case 'character': return newCharacter(oid, viewer, at);
      case 'sticky': return newSticky(oid, at, maker);   // R498
      case 'text': return newText(oid, at, maker);
      case 'howto': return newHowTo(oid, at);
      case 'docket': return newDocket(oid, at, maker);   // R532
      default: return newChip(oid, what.sign, what.points, at);
    }
  };
  // R518: the one Connection Table: taken while out, or put away, the same table comes to the pointer;
  // made, it keeps a row for every named GM card (R412).
  const takeTable = (e: PointerLike, mode: Mode) => {
    const at = table.toWorld(e.clientX, e.clientY), place = { x: Math.round(at.x - 40), y: Math.round(at.y - 20), z: topZ(), tilt: 0 };
    const found = game.all().find(([, r]) => (r as PieceRecord).kind === 'connections') as [string, Connections] | undefined;
    if (found) {
      const { away: _away, ...t } = found[1];
      game.change(w => w.put(found[0], { ...t, place }));
      if (mode !== 'below') drag?.start(found[0], e, e, mode === 'loose');
      return;
    }
    const oid = mint()(), rid = ridOf(oid);
    let t = newConnections(oid, place);
    for (const [, r] of game.all()) if ((r as PieceRecord).kind === 'character') t = keepRow(t, r as Character, mint()());
    game.change(w => w.put(rid, t));
    if (mode === 'below') return;
    drag?.fresh(rid);
    drag?.start(rid, e, e, mode === 'loose');
  };
  // R35: a new pool never lies under the bar; with no room above, it and its card slide down.
  const clearOfBar = (rid: string) => {
    const c = game.get(rid) as Character | undefined, bar = document.getElementById('bar');
    if (c?.kind !== 'character' || !bar) return;
    const top = Math.round(table.toWorld(0, bar.getBoundingClientRect().bottom).y + 10);
    const dy = top - c.pool.y;
    if (dy > 0) game.change(w => w.put(rid, { ...c, pool: { ...c.pool, y: top }, card: { ...c.card, y: c.card.y + dy } }));
  };
  const bar = new BarView(document.getElementById('bar')!, {
    version: HOLLOW_VERSION, date: HOLLOW_DATE, gm,
    // R512-R514: made at the pointer and carried on the press or loose, or put just below the strip.
    take: (what, down, e, mode) => {
      if (what === 'connections') { takeTable(e, mode); return; }
      const oid = mint()(), rid = ridOf(oid), rec = made(what, oid, table.toWorld(e.clientX, e.clientY));
      game.change(w => w.put(rid, rec));
      if (mode === 'below') { if (rec.kind === 'character') clearOfBar(rid); return; }
      drag?.fresh(rid);
      // Held where the pointer is now (made under it), on the same pointer as the press.
      const loose = mode === 'loose';
      if (rec.kind === 'character') drag?.startPool(rid, e, e, () => clearOfBar(rid), loose);
      else if (rec.kind === 'chip') drag?.startItem(rid, down, e);
      else drag?.start(rid, e, e, loose);
    },
    // R526, R527: this page's drawers; an entry taken out comes back under the pointer with all it took, carried.
    filed: () => desksOf(game.get('desk') as Desk | OldDesk | undefined),
    // R551, R552: the desks browsed as graveyards are; which is open is the GM's seat.
    cur: () => seat.desk.cur,
    setDesks: (desks, cur) => { game.change(w => w.put('desk', desks)); keep({ ...seat, desk: { cur } }); },
    // R559, R561: one change: the desktop leaving kept in the GM's desk record, the new one laid out.
    setOut: to => {
      const c = setOut(desksOf(game.get('desk') as Desk | OldDesk | undefined), game.all().filter(([, r]) => 'kind' in r) as [Rid, PieceRecord][], to);
      if (c) game.change(w => { w.put('desk', c.desk); for (const d of c.dels) w.del(d); for (const p of c.puts) w.put(p.rid, p.rec); });
    },
    takeOut: (at, k, move) => {
      const out = takeOut(desksOf(game.get('desk') as Desk | OldDesk | undefined), at, k);
      const recs = raised(out.records, table.toWorld(move.clientX, move.clientY), topZ());
      if (!recs.length) return;
      game.change(w => { w.put('desk', out.desk); for (const r of recs) w.put(ridFor(r), r); });
      const lead = recs[0]!;
      if (lead.kind === 'character') drag?.startPool(ridOf(lead.oid), move, move); else drag?.start(ridFor(lead), move, move);
    },
    // R515: picked images land at the pointer, a step apart; one alone let go in its pigeonhole is carried loose.
    images: (files, at, carry) => {
      const r = document.getElementById('table')!.getBoundingClientRect();
      const to = at ?? { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, c = table.toWorld(to.clientX, to.clientY);
      files.forEach((f, i) => void addImage(f, { x: Math.round(c.x - 120 + i * 24), y: Math.round(c.y - 80 + i * 24) }).then(rid => {
        if (!rid || !carry || !at) return;
        const p = { clientX: at.clientX, clientY: at.clientY } as PointerLike;
        drag?.fresh(rid);
        drag?.start(rid, p, p, true);
      }));
    },
  });
  // R526: the drawers are drawn again when this page's desk changes.
  game.listen(rids => { if (rids.has('desk')) bar.desk.render(); });
  const table = new TableView(document.getElementById('table')!, document.getElementById('world')!, {
    game, viewer, view: seat.view, keepView: v => keep({ ...seat, view: v }), schedule: frame,
    imageUrl: hash => blobs.url(hash), imageGone: hash => blobs.release(hash), missing,
    addImage,
    opened: () => new Set(seat.open.columns), setOpened: o => { keep({ ...seat, open: { ...seat.open, columns: [...o] } }); redraw(); },
    // R397: the Info card slid out of each NPC's card is this viewer's own.
    slid: () => new Set(seat.open.info), setSlid: o => { keep({ ...seat, open: { ...seat.open, info: [...o] } }); redraw(); },
    drag: (rid, down, move) => drag?.start(rid, down, move),
    // R259: your own Resources only; anyone's Motivations and Damage.
    dragGlyph: (src, down, move) => {
      const colon = src.indexOf(':'), c = game.get(ridOf(src.slice(0, colon))) as Character | undefined;
      if (c?.kind !== 'character' || !mayTap(viewer, c, src.slice(colon + 1))) return false;
      drag?.startGlyph(src, down, move);
      return true;
    },
    mint,
    poolOpen: () => ({ piles: new Set(seat.open.piles), slots: new Set(seat.open.slots), used: new Set(seat.open.used) }),
    // Seat-tier openings: looking never changes the game (R128).
    toggle: (kind, key, on) => {
      const now = new Set(seat.open[kind]);
      if (on ?? !now.has(key)) now.add(key); else now.delete(key);
      keep({ ...seat, open: { ...seat.open, [kind]: [...now] } });
      redraw();
    },
    dragItem: (rid, down, move) => drag?.startItem(rid, down, move),
    // R75–R77: an action's die brings the roll row; the action in use gets its swish.
    useAction: (oid, label, alt) => rollRow?.action(oid, label, alt) ?? false,
    react: (pc, npc) => rollRow?.react(pc, npc) ?? false,
    // R504: the names claimed at the table (the GM's page holds the claims), for the GM's checklist.
    players: () => Object.keys((game.get('book') as Book | undefined)?.claims ?? {}).sort(),
    inUse: oid => rollRow?.inUse(oid) ?? null,
    taking: () => taking,
    turnPage: k => { if (taking) { taking = { ...taking, k: Math.max(0, Math.min(k, taking.pages.length - 1)) }; redraw(); } },
    takePage: () => {
      const t = taking;
      cancelTake();
      if (t) void rolling().take(t.id, t.pages[t.k]!);
    },
    cancelTake,
    eyes,
    // R403: an emptied Info card is buried in the graveyard being browsed, with its own name for the merge.
    buryInfo: (oid, k, text) => {
      const c = game.get(ridOf(oid)) as Character | undefined, y = (game.get('yards') as Yards | undefined) ?? emptyYards();
      if (c?.kind !== 'character') return;
      const cur = Math.min(seat.boothill.cur, y.yards.length - 1);
      game.change(w => w.put('yards', buryInfo(y, cur, c.name, { oid, k, text }, mint()())));
    },
    // R401: the GM's menu on a pool makes an Info card on it, slid out with the caret in it.
    addInfo: oid => {
      const rid = ridOf(oid), c = game.get(rid) as Character | undefined;
      if (c?.kind !== 'character') return;
      const k = (c.info ?? []).length;
      game.change(w => w.put(rid, { ...c, info: [...(c.info ?? []), ''] }));
      slideInfo(oid, k);
      document.querySelector<HTMLElement>(`.card[data-rid="${rid}"] .infopaper .text`)?.focus();
    },
    // R422-R426: a record made from the NPC's menu, held by its row (its group's, R426), started as the
    // book's first meeting starts it, its cell in step; the table is made, put away, when there is none.
    addOpinion: (oid, of) => {
      const all = game.all().map(([, r]) => r as PieceRecord), chars = all.filter((r): r is Character => r.kind === 'character');
      const c = chars.find(x => x.oid === oid);
      let t = tableOf(all) ?? { ...newConnections(mint()(), { x: 0, y: 0, z: 0, tilt: 0 }), away: true };
      if (!c) return;
      t = keepRow(t, c, mint()());
      const holder = rowOf(t, c), pc = pcsOf(chars).find(x => x.oid === of);
      if (!holder) return;
      const rec: Opinion = { kind: 'opinion', oid: mint()(), holder: holder.id, of,
        text: first(t, all.filter((r): r is Opinion => r.kind === 'opinion'), holder.id, of, c, pc) };
      game.change(w => { w.put(ridOf(t.oid), synced(t, rec)); w.put(ridOf(rec.oid), rec); });
      slideInfo(oid, `o${rec.oid}`);
    },
    // R428: an emptied record is buried whole, with its last words, named for its holder and character.
    buryRecord: (oid, words) => {
      const rid = ridOf(oid), rec = game.get(rid) as Opinion | undefined, y = (game.get('yards') as Yards | undefined) ?? emptyYards();
      const all = game.all().map(([, r]) => r as PieceRecord), t = tableOf(all);
      if (rec?.kind !== 'opinion' || !t) return;
      const chars = all.filter((r): r is Character => r.kind === 'character'), cur = Math.min(seat.boothill.cur, y.yards.length - 1);
      game.change(w => {
        w.del(rid);
        if (words.trim()) w.put('yards', buryRecord(y, cur, nameOf(t, chars, rec.holder), nameOf(t, chars, rec.of), { ...rec, text: words }, mint()()));
      });
    },
    // R142, R144, R146, R381: the die by a pool's name claims, opens, or docks the roll row.
    poolDie: (oid, shift, die) => {
      const c = game.get(ridOf(oid)) as Character | undefined;
      if (c?.kind !== 'character') return;
      const r = shift ? shiftClick(viewer, c) : click(viewer, c);
      if ('owner' in r) game.change(w => w.put(ridOf(oid), { ...c, owner: r.owner }));
      else if ('dock' in r) rollRow?.dock(oid);
      else { die.title = r.refused; die.animate?.([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], 200); }
    },
    dragPool: (rid, down, move) => drag?.startPool(rid, down, move),
    dragTack: (rid, down, move) => drag?.startTack(rid, down, move),   // R571
  });
  // R122: the graveyard being browsed, where a put-away piece goes.
  const yard = () => {
    const y = (game.get('yards') as Yards | undefined) ?? emptyYards(), cur = Math.min(seat.boothill.cur, y.yards.length - 1);
    return { cur, name: y.yards[cur]!.name };
  };
  // R298, R299: every hand, this page's and others', drawn alike, again after every redraw.
  const hands = new Hands({ game, table });
  table.after = () => hands.react();
  drag = new Drag({ game, table, hands, hand, moves, mint, schedule: frame, yard, who: () => viewer?.name, gm });
  // R110–R113: this page's tape, under the pieces; a torn roll is carried off like any piece.
  const tape = new TapeView(document.getElementById('table')!, {
    game, viewer, up: () => seat.tapeUp, setUp: up => keep({ ...seat, tapeUp: up }),
    crit: (id, choice, lock) => rolling().crit(id, choice, lock), mint: () => mint()(),
    owner: oid => (game.get(ridOf(oid)) as Character | undefined)?.owner,
    take: startTake,
    givable: id => rolling().givable(id), transfer: (id, resource) => void rolling().transfer(id, resource),
    name: (id, damage, row, text) => void rolling().name(id, damage, row, text),
    toWorld: (x, y) => table.toWorld(x, y), carry: (rid, down, move) => drag?.start(rid, down, move),
  });
  // R115–R117: the register at the bar's right end; the tape hangs under it (R282).
  const register = new RegisterView(document.getElementById('bar')!, { game, viewer, checkpoint, paperRoll: () => tape.toggleUp() });
  const hang = () => {
    const t = document.getElementById('tape');
    if (t) { t.style.right = 'auto'; t.style.left = `${Math.max(8, Math.min(innerWidth - 258, register.left() + 2))}px`; }
  };
  // R132, R291: the Ledger between the register and Boot Hill; a restore keeps the seat, skipping
  // whatever has vanished (R136).
  new LedgerView(document.getElementById('bar')!, document.body, { ...ledger, restore: async id => {
    await ledger.restore(id);
    const yards = (game.get('yards') as Yards | undefined) ?? emptyYards();
    keep(pruneSeat(seat, rid => game.get(rid) !== undefined, yards.yards.length));
    redraw();
  } });
  // R118–R125, R289: Boot Hill after the register; a dug-up piece is carried from the press.
  const hill = new BootHillView(document.getElementById('bar')!, document.body, {
    game, cur: () => seat.boothill.cur, setCur: cur => keep({ ...seat, boothill: { ...seat.boothill, cur } }),
    open: () => seat.boothill.open, setOpen: open => keep({ ...seat, boothill: { ...seat.boothill, open } }),
    toWorld: (x, y) => table.toWorld(x, y), top: topZ,
    slideInfo,
    carry: (lead, down, move) => lead.kind === 'character' ? drag?.startPool(ridOf(lead.oid), down, move) : drag?.start(ridFor(lead), down, move),
  });
  // R404: on the GM's page, Ctrl+Z / ⌘Z outside written text digs up the newest Info card buried.
  if (gm) addEventListener('keydown', ev => { if (isPageUndo(ev) && hill.undoCard()) ev.preventDefault(); });
  // R531, R545: pinned paper follows its holder: on the page holding the game (its book, whoever it is
  // viewed as) the table's paper; on every page its own "just me" paper. A holder was deleted when the book
  // holds its tombstone or this page saw it go (a docket another page put away).
  const deleted = new Set<Oid>();
  const repinned = () => {
    const book = game.get('book') as Book | undefined;
    const puts = repin(game.all().filter(([, r]) => 'kind' in r) as [Rid, PieceRecord][], !!book, oid => deleted.has(oid) || !!book?.tomb[ridOf(oid)]);
    deleted.clear();
    if (puts.length) game.change(w => { for (const p of puts) w.put(p.rid, p.rec); });
  };
  game.listen(rids => {
    for (const rid of rids) if (onTable(rid) && !game.get(rid)) deleted.add(rid.slice(2));
    queueMicrotask(repinned);
  });
  // R412, R415: a GM card's row follows its name and group as they change; a card first seen is only
  // remembered, so a row the GM cleared stays cleared until its card is renamed.
  if (gm) {
    const sig = (c: Character) => `${c.name.trim()}\n${groupOf(c.front) ?? ''}`, seen = new Map<Oid, string>();
    const npc = (r: unknown): r is Character => { const p = r as PieceRecord | undefined; return p?.kind === 'character' && p.owner === GM; };
    for (const [, r] of game.all()) if (npc(r)) seen.set(r.oid, sig(r));
    game.listen(rids => queueMicrotask(() => {
      const found = game.all().find(([, r]) => (r as PieceRecord).kind === 'connections') as [string, Connections] | undefined;
      let t = found?.[1];
      for (const rid of rids) {
        const c = game.get(rid);
        if (!npc(c)) continue;
        const was = seen.get(c.oid), now = sig(c);
        seen.set(c.oid, now);
        if (t && was !== undefined && was !== now) t = keepRow(t, c, mint()());
      }
      if (found && t !== found[1]) game.change(w => w.put(found[0], t!));
      // R437: a revealed record's cards and name follow its row's members and its character's name.
      if (!t) return;
      const all = game.all().map(([, r]) => r as PieceRecord), chars = all.filter((r): r is Character => r.kind === 'character');
      const moved = all.flatMap(r => {
        if (r.kind !== 'opinion' || !r.shown?.length) return [];
        const now = published(t!, chars, r);
        return JSON.stringify(now) === JSON.stringify(r) ? [] : [now];
      });
      if (moved.length) game.change(w => { for (const r of moved) w.put(ridOf(r.oid), r); });
    }));
  }
  hang();
  addEventListener('resize', hang);
  void document.fonts?.ready.then(hang);
  // R347: the Opposition button and the world's tray, in the bar.
  const tray = new TrayView(bar.oppo, { game, viewer });
  rollRow = new RollRowView({
    game, viewer, tray, mint: () => mint()(),
    inferring: () => eyes.any(),
    // R364: the type last chosen for an action on a card, in this viewer's seat.
    remembered: (oid, label) => seat.types[`${oid}:${label}`],
    remember: (oid, label, type) => keep({ ...seat, types: { ...seat.types, [`${oid}:${label}`]: type } }),
    pool: oid => table.pool(ridOf(oid)), redraw: oids => table.render(oids.map(ridOf)),
    // R100–R104, R281: the GM's page rolls at once (privately if switched); a player's asks it, Roll
    // reading "GM…" meanwhile; why not prints as a note on the tape.
    roll: r => {
      const rolls = rolling(), intent = intentOf(r);
      // R353: a roll that goes through lets the row start fresh after a variant.
      if (gm) { const why = rolls.roll(intent, !!r.priv); if (why) rolls.note(why); else rollRow!.rolled(r.pool); return; }
      rollRow!.waiting(r.pool, true);
      void rolls.request(intent).then(why => { rollRow!.waiting(r.pool, false); if (why) rolls.note(why); else rollRow!.rolled(r.pool); });
    },
  });
  return { table, drag, bar, hands };
}

// R294: arriving by an invite asks for a name until one that isn't "GM" is given; cancel is "Player".
// R476: it lists the names this browser holds, offering the last one used.
function askName(held: string[], last: string | null): string {
  const ask = held.length ? `Your name at the table\nYours in this browser: ${held.join(', ')}` : 'Your name at the table';
  for (;;) { const n = arrivalName(prompt(ask, last ?? undefined), held); if (n) return n; }
}

// R163, R293: this page's tag: lit while live, "offline" with why.
function meOf(p: Presence, name: string, gm: boolean): Me {
  return { name, gm, live: p.status.state === 'live', ...(p.status.state === 'offline' && { why: p.status.why }) };
}

// R293: the others at the table, dimmed when unheard.
function here(p: Presence): Here[] {
  return [...p.people].map(([tab, person]) => ({ tab, ...person, stale: p.stale(tab) }));
}

// R132–R135, R138, R139, R141: what the Ledger does with this browser's games; another game, a new
// one or an imported one is opened by reloading onto it.
/** R455: what the Ledger adds to its status once the browser has been asked to keep the storage. */
const keptNote = (k: boolean | null) => k === null ? '' : k ? ' · Storage kept' : ' · The browser may clear this storage';

function ledgerOf(store: GameStore, blobs: BlobStore, player: boolean): LedgerWith {
  const onto = async (id: string) => { await store.open(id); location.reload(); };
  // R459: after a deletion, images nothing uses go.
  const free = async () => { await blobs.free(new Set(await store.images())); };
  return {
    player, now: () => clock.now(), round: () => (store.game.get('meta') as Meta).round,
    // R455: and whether the browser keeps this storage, once it has been asked.
    current: () => store.current!, status: () => store.status() + keptNote(store.kept()), rename: name => store.rename(name),
    checkpoints: () => store.checkpoints(), games: () => store.list(),
    checkpoint: name => store.checkpoint(name, false), restore: id => store.restore(id), open: onto,
    forget: async id => { await store.forget(id); await free(); },
    forgetCheckpoint: async id => { await store.forgetCheckpoint(id); await free(); },
    joined: () => store.joined(),
    newGame: async name => onto((await store.add(name)).id),
    exported: () => exportGame(store, blobs, store.current!.id),
    imported: async text => onto((await importGame(store, blobs, text)).id),
  };
}

// R195: an image is drawn again when its bytes arrive or it is found missing.
function redrawImages(game: Game, table: TableView, hash: string): void {
  table.render(game.all().filter(([, r]) => (r as PieceRecord).kind === 'image' && (r as Image).blob === hash).map(([rid]) => rid));
}

const OLD_INVITE = 'This invite is from an older version of the table. Ask the GM for a new link.';

async function main() {
  const db = await IdbDb.open();
  // R455: once a game is first saved, the browser is asked to keep this storage.
  const store = new GameStore(db, clock, localStorage, async () => !!navigator.storage?.persist && (await navigator.storage.persisted() || await navigator.storage.persist()));
  const blobs = new BlobStore(db, measure);
  const sealer = await Sealer.make();
  const tab = tabId(sessionStorage), invited = fromUrl(location.search);
  // R297: a page opened with the test hook may be told to meet through the specs' local relay.
  const relay = new URLSearchParams(location.search).has('test') ? local('hollow.relay') ?? undefined : undefined;
  const stamps = new Stamps(sessionStorage);
  const rng = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
  addEventListener('pagehide', () => { void store.save(); });

  // R473: an invite from before Trystero proved ids opens no table, and says why.
  if (invited === 'old') {
    document.body.replaceChildren(Object.assign(document.createElement('p'), { className: 'old-invite', textContent: OLD_INVITE }));
    return { version: HOLLOW_VERSION, date: HOLLOW_DATE, role: 'old' as const };
  }

  if (invited) {
    // R476: a player, the name the tab's, asked when the tab has none; R475: it joins with that name's
    // key, R477: the browser's name from before keeping the browser's own. R483: with that name's copy of
    // the GM's table, kept per room and name; the name keeping the browser's key keeps the copy from before.
    const last = local('hollow.name'), held = await Identity.held(db, last);
    const name = session('hollow.name') ?? session('hollow.name', askName(held, last)) ?? 'Player';
    local('hollow.name', name);
    const identity = await Identity.player(db, name), own = identity.id === (await Identity.load(db)).id;
    const { id: copyId } = await store.copyFor(invited.room, identity.id, own, name);
    const game: Game = store.game;
    const wire = new Wire(invited.room, { identity, sealer, tab, relay });
    // Copy only asks what's held when a message arrives, after Moves is made.
    const copy = new Copy({ game, stamps, sealer, link: wire, clock, session: sessionStorage, local: localStorage, room: invited.room, copy: copyId, gm: invited.gm,
      held: rid => moves.holds(rid) });
    let hands: Hands | undefined;
    const moves = new Moves({ stamps, tab, send: m => { void wire.send('move', m); }, shared: shared(game), place: cs => shown(hands, cs), timers: clock, schedule: frame });
    wire.on('move', (b: Move, from) => moves.receive(from.tab, b));
    const presence = new Presence({ net: wire, clock, role: 'player', name, gone: tab => { rolls.left(tab); hands?.leave(tab); } });
    // R167, R296, R447: the GM's page, and only the GM's browser, says when this page is nobody, and when
    // it is handed the name.
    let notYours: string | null = null;
    wire.on('claim', (b: { why: string | null }, from) => { if (from.browser === invited.gm) notYours = b.why; });
    // R446: who holds each name, from the GM's browser only, to bar impostors' tags (R445).
    let claims: Record<string, string> = {};
    wire.on('claims', (b: { claims: Record<string, string> }, from) => { if (from.browser === invited.gm) claims = b.claims; });
    // R469: a rename goes to the GM's page; taken, the seat follows and the page reloads as the new name;
    // refused, or the GM's page away, the tag says why for a few seconds.
    let said: string | null = null, saidUntil = 0;
    const say = (why: string) => { said = why; saidUntil = clock.now() + 4000; };
    wire.on('rename', (b: { to: string; why?: string | null }, from) => {
      if (from.browser !== invited.gm || b.why === undefined) return;
      if (b.why) { say(b.why); return; }
      const to = b.to.trim(), id = store.current!.id;
      saveSeat(localStorage, id, to, loadSeat(localStorage, id, name));
      session('hollow.name', to);
      local('hollow.name', to);
      // R478: the name's key goes with it, so the id holds.
      void Identity.renamed(db, name, to).then(() => location.reload());
    });
    const rename = () => {
      const answer = prompt('Your name at the table', name);
      if (answer === null || answer.trim() === name) return;
      const gmTab = here(presence).find(p => p.role === 'gm' && !p.stale)?.tab;
      if (!gmTab) { say("The GM's page must be at the table to rename"); return; }
      void wire.send('rename', { to: answer.trim() }, gmTab);
    };
    const rolls = new Rolls({ game, sealer, clock, rng, link: wire, session: sessionStorage, gm: false, gmBrowser: invited.gm });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game);
    images.changed(hash => redrawImages(game, table, hash));
    images.start();
    presence.start();
    copy.start();
    const v = views(game, store.current!.id, { name, gm: false }, blobs, moves, tab, hash => images.missing.get(hash), ledgerOf(store, blobs, true), () => rolls);
    const { table, drag, bar } = v;
    hands = v.hands;
    new FolksView(bar.folks, bar.youAre, { me: () => ({ ...meOf(presence, name, false), ...(notYours !== null && { notYours }),
      ...(said !== null && clock.now() < saidUntil && { said }) }), people: () => here(presence), held: n => claims[n], rename });
    return { version: HOLLOW_VERSION, date: HOLLOW_DATE, role: 'player' as const, tab, identity, store, blobs, wire, presence, copy, rolls, images, moves, view: table, drag };
  }

  // The GM's page: the game is here; a table opens on demand, in the room remembered for this game.
  // R474: it uses the browser's own key.
  const identity = await Identity.load(db);
  await store.start();
  const game: Game = store.game;
  // R380: an older game's Fields and Skills, marked the first time the GM's page opens it.
  const older = markOlder(game);
  if (older) game.change(older);
  // R472: claims made under ids from before Trystero proved them go; players claim again on arriving.
  const stale = oldClaims(game);
  if (stale) game.change(stale);
  // R487: torn rolls shared before this become the GM's page's own, and leave every other page.
  const torn = ownTorn(game.all(), game.get('yards') as Yards | undefined, game.get('hill') as Hill | undefined);
  if (torn.puts.length || torn.dels.length) game.change(w => { for (const rid of torn.dels) w.del(rid); for (const [rid, r] of torn.puts) w.put(rid, r); });
  let gmShown = local('hollow.gmname') ?? GM;
  let table: { room: string; wire: Wire; presence: Presence; authority: Authority; rolls: Rolls; images: ImageExchange } | null = null;
  let rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  // Drags go to the room once there is one; players' drags are judged like their changes.
  const moves = new Moves({ stamps, tab, send: m => { void table?.wire.send('move', m); }, shared: shared(game),
    place: cs => shown(hands, cs, c => !!table?.authority.mayMove(c.tab, c.rid)), timers: clock, schedule: frame });

  // R157: Open the table makes the room (or reopens this game's); the GM's URL is never rewritten.
  const open = () => {
    if (table) return table;
    const key = `hollow.room.${store.current!.id}`;
    const room = local(key) ?? local(key, newRoom(store.current!.name))!;
    const wire = new Wire(room, { identity, sealer, tab, relay });
    const presence = new Presence({ net: wire, clock, role: 'gm', name: gmShown,
      here: (p, from) => { if (p.role === 'player') authority.join(from.tab, p.name, from.browser, from.sealKey); },
      gone: tab => hands.leave(tab) });
    const authority = new Authority({ game, stamps, sealer, link: wire, schedule: queueMicrotask });
    const whoIs = (from: { tab: string; browser: string }) => {
      const p = presence.people.get(from.tab), held = p && (game.get('book') as Book).claims[p.name];
      return p && held === from.browser ? p.name : null;
    };
    rolls = new Rolls({ game, sealer, clock, rng, link: wire, session: sessionStorage, gm: true, whoIs });
    const images = new ImageExchange(wire, blobs, clock);
    // R26: the GM's page fetches a player's images too.
    images.watch(game);
    images.changed(hash => redrawImages(game, view, hash));
    images.start();
    presence.start();
    wire.on('move', (b: Move, from) => moves.receive(from.tab, b));
    table = { room, wire, presence, authority, rolls, images };
    return table;
  };
  // R158: the invite carries the room and the GM's browser id; shift-click closes the table.
  const link = () => invite(location.href, open().room, identity.id);
  const close = () => {
    if (!table) return;
    void table.presence.close();
    table = null;
    rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  };
  // R153: the real GM views as someone else from the seat's viewAs; the page reloads to change it.
  const gmSeat = loadSeat(localStorage, store.current!.id, GM), viewer: Viewer = gmSeat.viewAs ? { name: gmSeat.viewAs, gm: false } : { name: GM, gm: true };
  const { table: view, drag, bar, hands } = views(game, store.current!.id, viewer, blobs, moves, tab, hash => table?.images.missing.get(hash), ledgerOf(store, blobs, false), () => rolls,
    // R459: End's checkpoint may prune old ones, so images nothing uses go after it.
    name => store.checkpoint(name, true).finally(() => void store.images().then(i => blobs.free(new Set(i))).catch(() => undefined)));
  new FolksView(bar.folks, bar.youAre, {
    me: () => table ? meOf(table.presence, gmShown, true) : { name: gmShown, gm: true, live: false },
    people: () => table ? here(table.presence) : [],
    held: name => (game.get('book') as Book).claims[name],
    rename: () => {
      gmShown = gmName(prompt('Your name, as players see it', gmShown), gmShown);
      local('hollow.gmname', gmShown);
      table?.presence.rename(gmShown);
    },
    handOver: (name, browser) => { handOver(game, name, browser); table?.authority.handedOver(name); },
    table: { opened: () => !!table, open: () => void open(), invite: link, close },
    viewAs: {
      current: () => gmSeat.viewAs ?? GM,
      choices: () => viewAsChoices([...(table?.presence.people.values() ?? [])].filter(p => p.role === 'player').map(p => p.name),
        game.all().map(([, r]) => r as Character).filter(c => c.kind === 'character').map(c => c.owner)),
      choose: name => { saveSeat(localStorage, store.current!.id, GM, { ...gmSeat, viewAs: name === GM ? null : name }); location.reload(); },
    },
  });
  return { version: HOLLOW_VERSION, date: HOLLOW_DATE, role: 'gm' as const, tab, identity, store, blobs, open, invite: link, moves, view, drag,
    get table() { return table; }, get rolls() { return rolls; },
    // R361: for the browser specs, the records someone who owns nothing may see at all.
    forNobody: () => game.all().map(([rid]) => rid).filter(shared(game)) };
}

// R361: a piece someone who owns nothing may see at all: anything but a private mat's. R486: nor a page's own.
// R502: nor paper naming who reads it, so its carry stays on the carrier's page.
const shared = (game: Game) => (rid: string): boolean => {
  if (isLocal(rid)) return false;
  const r = game.get(rid);
  return !r || !!redact(r, null, oid => game.get(ridOf(oid)) as Character | undefined);
};

const ready = main();
if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as { hollow: unknown }).hollow = { version: HOLLOW_VERSION, date: HOLLOW_DATE, ready };
}
