// CRC: crc-Dockets.md | R531, R534, R536, R537, R538, R539, R542, R543, R545
// Dockets, pure: the red tape's shape and the touch test, where a tied docket's papers pile, and which
// pinned paper must be moved to its holder or let loose. Boxes come in, places and paths go out.

import { isMine, isPiece, isPinnable, type Oid, type PieceRecord, type Pinnable, type Rid } from '../model/records.ts';

export type Point = { x: number; y: number };
export type Box = { left: number; top: number; right: number; bottom: number };
/** The convex hull, clockwise on screen, pushed out by `r`. */
export type Tape = { hull: Point[]; r: number };

/** How far the tape stands off its papers, and how wide the cord is drawn. */
export const RADIUS = 14, CORD = 3;
/** How far each piled paper sits right and down from the one under it, and below the label (R542). */
export const PILE_STEP = 5, PILE_GAP = 6;

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

// R534: the convex hull, by the monotone chain, clockwise on screen (y down); one point or two are their
// own hull.
/** The convex hull of `points`. */
export function hull(points: Point[]): Point[] {
  const ps = [...new Map(points.map(p => [`${p.x},${p.y}`, p])).values()].sort((a, b) => a.x - b.x || a.y - b.y);
  if (ps.length < 3) return ps;
  const half = (list: Point[]) => {
    const h: Point[] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2]!, h[h.length - 1]!, p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  const h = [...half(ps), ...half([...ps].reverse())];
  return area(h) < 0 ? h.reverse() : h;
}

/** Twice the signed area, positive when clockwise on screen. */
function area(h: Point[]): number {
  let a = 0;
  h.forEach((p, i) => { const q = h[(i + 1) % h.length]!; a += p.x * q.y - q.x * p.y; });
  return a;
}

const corners = (b: Box): Point[] => [{ x: b.left, y: b.top }, { x: b.right, y: b.top }, { x: b.right, y: b.bottom }, { x: b.left, y: b.bottom }];

/** R534: the tape round these boxes (the label's and its papers'). */
export function tapeOf(boxes: Box[]): Tape { return { hull: hull(boxes.flatMap(corners)), r: RADIUS }; }

// R534: each hull edge pushed out by r, the corners arcs round the hull's vertices; a point is a circle.
/** The SVG path of a tape. */
export function path(t: Tape): string {
  const { hull: h, r } = t, f = (n: number) => Math.round(n * 10) / 10;
  if (!h.length) return '';
  if (h.length === 1) { const p = h[0]!; return `M${f(p.x - r)},${f(p.y)}a${r},${r} 0 1 0 ${2 * r},0a${r},${r} 0 1 0 ${-2 * r},0Z`; }
  // Clockwise on screen, so an edge's outward normal is (dy, -dx), and the corners sweep clockwise.
  const out = (a: Point, b: Point): Point => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: dy / l * r, y: -dx / l * r }; };
  const arc = `A${r},${r} 0 0 1 `, parts: string[] = [];
  h.forEach((a, i) => {
    const b = h[(i + 1) % h.length]!, n = out(a, b);
    const s = { x: a.x + n.x, y: a.y + n.y }, e = { x: b.x + n.x, y: b.y + n.y };
    parts.push(`${i ? arc : 'M'}${f(s.x)},${f(s.y)}L${f(e.x)},${f(e.y)}`);
  });
  const a0 = h[0]!, n0 = out(a0, h[1]!);
  return `${parts.join('')}${arc}${f(a0.x + n0.x)},${f(a0.y + n0.y)}Z`;
}

/** Whether `p` is inside the convex hull `h` (clockwise on screen), its edges included. */
function inHull(h: Point[], p: Point): boolean {
  if (h.length < 3) return false;
  return h.every((a, i) => cross(a, h[(i + 1) % h.length]!, p) >= 0);
}

const inBox = (b: Box, p: Point) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;

/** Whether segments ab and cd meet, touching included. */
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const on = (p: Point, q: Point, s: Point) => Math.min(p.x, q.x) <= s.x && s.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= s.y && s.y <= Math.max(p.y, q.y);
  return (d1 === 0 && on(c, d, a)) || (d2 === 0 && on(c, d, b)) || (d3 === 0 && on(a, b, c)) || (d4 === 0 && on(a, b, d));
}

/** How far `p` is from the segment ab. */
function toSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const edges = (ps: Point[]): [Point, Point][] => ps.length < 2 ? [] : ps.map((p, i) => [p, ps[(i + 1) % ps.length]!]);

// R537: the five steps, on the bare hull, the rounding taken by the last.
/** Whether `box` touches the tape, inside it or on its cord. */
export function touches(t: Tape, box: Box): boolean {
  const h = t.hull, reach = t.r + CORD / 2;
  if (!h.length) return false;
  // 1. the hull's bounding box, padded by the reach
  const xs = h.map(p => p.x), ys = h.map(p => p.y);
  if (box.right < Math.min(...xs) - reach || box.left > Math.max(...xs) + reach
    || box.bottom < Math.min(...ys) - reach || box.top > Math.max(...ys) + reach) return false;
  const c = corners(box);
  if (c.some(p => inHull(h, p))) return true;                                    // 2. a box corner in the hull
  if (h.some(p => inBox(box, p))) return true;                                   // 3. a hull vertex in the box
  const he = edges(h), be = edges(c);
  if (he.some(([a, b]) => be.some(([p, q]) => crosses(a, b, p, q)))) return true; // 4. edges crossing
  // 5. disjoint and convex: nearest is a vertex of one and an edge of the other
  const near = Math.min(...h.flatMap(v => be.map(([p, q]) => toSegment(v, p, q))),
    ...c.flatMap(v => he.map(([a, b]) => toSegment(v, a, b))));
  return near <= reach;
}

/** A docket as the aim sees it: its tape (the carried piece left out) and its height on the table. */
export type Target = { oid: Oid; z: number; tape: Tape };

// R536, R538, R539: of the dockets whose tape the box touches, the one on top.
/** The docket a carried box would join, or null. */
export function aimed(targets: Target[], box: Box): Oid | null {
  let best: Target | null = null;
  for (const t of targets) if ((!best || t.z > best.z) && touches(t.tape, box)) best = t;
  return best?.oid ?? null;
}

// R542: squarely under the label, a step right and down each, in z order.
/** Where each of a tied docket's papers lies, by rid. */
export function pile(label: Box, papers: { rid: Rid; z: number }[]): Map<Rid, Point> {
  const order = [...papers].sort((a, b) => a.z - b.z);
  return new Map(order.map((p, i) => [p.rid, { x: label.left + i * PILE_STEP, y: label.bottom + PILE_GAP + i * PILE_STEP }]));
}

// R531, R545: pinned paper goes to its holder plus its offset, and is let loose where it lies when its
// holder was deleted (`gone`, the GM's page's tombstones; a holder merely not here, a "just me" docket on
// another page, is left alone): shared paper on the GM's page, and on every page its own `mine` paper. A
// gathered card's record doesn't say where it is drawn (under its pool), so it moves nothing.
/** The puts that bring pinned paper to its holder, or let it loose. */
export function repin(all: [Rid, PieceRecord][], gm: boolean, gone: (oid: Oid) => boolean): { rid: Rid; rec: Pinnable }[] {
  const holders = new Map<Oid, Point | null>();
  for (const [, r] of all) {
    if (r.kind === 'character') holders.set(r.oid, r.gathered ? null : r.card);
    else if (r.kind === 'docket') holders.set(r.oid, r.place);
  }
  const puts: { rid: Rid; rec: Pinnable }[] = [];
  for (const [rid, r] of all) {
    if (!isPinnable(r) || !r.pin || !(isMine(rid) || (gm && isPiece(rid)))) continue;
    if (!holders.has(r.pin.card)) {
      if (gone(r.pin.card)) { const { pin: _was, ...loose } = r; puts.push({ rid, rec: loose }); }
      continue;
    }
    const h = holders.get(r.pin.card);
    if (!h) continue;
    const x = h.x + r.pin.dx, y = h.y + r.pin.dy;
    if (x !== r.place.x || y !== r.place.y) puts.push({ rid, rec: { ...r, place: { ...r.place, x, y } } });
  }
  return puts;
}
