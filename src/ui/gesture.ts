// CRC: crc-Gesture.md | Seq: seq-drag.md#1, seq-drag.md#1.1 | R10, R14
// One reading of the pointer for every control: a click, a "shift" click (shift, ctrl or alt held,
// or a long press on touch), or the start of a drag. Every control that reacts to shift-click is
// registered here, so none can lack its long press.

export const LONG_MS = 500, DRAG_PX = 5;

/** What a control does with each reading. `drag` gets the press and the move that started it. */
export type Handlers = {
  click?: (e: PointerLike) => void;
  shift?: (e: PointerLike) => void;
  drag?: (down: PointerLike, move: PointerLike) => void;
};

/** The part of a PointerEvent a gesture reads (so tests can dispatch plain events). */
export type PointerLike = Event & {
  clientX: number; clientY: number; button?: number; pointerId?: number;
  shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; key?: string;
};

type Timers = { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(h: unknown): void };
const real: Timers = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: h => clearTimeout(h as number) };

/** Every element registered with a shift handler, for the quality-floor test (R14). */
export const shifty = new Set<EventTarget>();

const shifted = (e: PointerLike) => !!(e.shiftKey || e.ctrlKey || e.altKey);

/** The handler a click reads as: shift when held and there is one, click otherwise. */
const clickOf = (h: Handlers, e: PointerLike) => (shifted(e) ? h.shift ?? h.click : h.click);

// R14: a long press is a shift-click, and never also a click.
/** Listens on `el`; returns a function that stops listening. */
export function gesture(el: EventTarget, h: Handlers, timers: Timers = real): () => void {
  if (h.shift) shifty.add(el);
  let down: PointerLike | null = null, long: unknown = null, done = false;
  const reset = () => {
    if (long !== null) timers.clearTimeout(long);
    long = null;
    down = null;
    stop();
  };
  const onMove = (ev: Event) => {
    const e = ev as PointerLike;
    if (!down || done || e.pointerId !== down.pointerId) return;
    if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_PX) return;
    done = true;
    const d = down;
    reset();
    h.drag?.(d, e);
  };
  const onUp = (ev: Event) => {
    const e = ev as PointerLike;
    if (!down || e.pointerId !== down.pointerId) return;
    const d = down, fired = done;
    reset();
    if (fired) return;
    clickOf(h, d)?.(e);
  };
  const onCancel = () => reset();
  const target: EventTarget = (el as Node).ownerDocument ?? (globalThis as { document?: Document }).document ?? el;
  const stop = () => {
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
    target.removeEventListener('pointercancel', onCancel);
  };
  const onDown = (ev: Event) => {
    const e = ev as PointerLike;
    if ((e.button ?? 0) !== 0) return;
    if (h.drag) e.stopPropagation();   // the control takes the press; the table doesn't pan
    reset();
    down = e;
    done = false;
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
    if (h.shift) {
      long = timers.setTimeout(() => {
        long = null;
        if (!down || done) return;
        done = true;
        h.shift!(down);
      }, LONG_MS);
    }
  };
  // R12: a control is a keyboard control too: Enter or Space clicks, with shift it shift-clicks.
  const onKey = (ev: Event) => {
    const e = ev as PointerLike;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target !== el) return;
    e.preventDefault();
    clickOf(h, e)?.(e);
  };
  el.addEventListener('pointerdown', onDown);
  if (h.click || h.shift) el.addEventListener('keydown', onKey);
  return () => {
    reset();
    shifty.delete(el);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('keydown', onKey);
  };
}
