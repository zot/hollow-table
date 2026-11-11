# Stamps
**Requirements:** R180, R181, R182

Ordering without a clock. Each page numbers what it sends on one counter; each piece remembers the
highest number it has applied from each page.

## Knows
- seq: this page's counter, shared by moves and changes, kept in sessionStorage so a reload
  continues it.
- peers: sender tab → a small local integer (each page numbers its own).
- highest: rid → (peer int → highest number applied).

## Does
- next(): the next number.
- fresh(rid, peer, s): whether `s` is not lower than the highest applied for that piece from that
  peer.
- mark(rid, peer, s).
- A **deletion is a fresh change**: it is sent under `next()`, never under the piece's last change
  number. (On 11-11 a deletion reused the last change number; the drag to the bar had already sent
  higher-numbered moves, so the players' pages discarded it as stale.)

## Collaborators
- none

## Sequences
- seq-move.md
- seq-sync.md
