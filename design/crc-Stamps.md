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
- next(): the next number. The storage is passed in (sessionStorage on the page).
- peer(tab): a sending page's small local integer, in the order this page meets them.
- fresh(rid, tab, s): whether `s` is not lower than the highest applied for that piece from that
  page.
- mark(rid, tab, s).
- forget(rid, tab): drops what was applied to a piece from one page; Copy forgets its own numbers
  for a change it gives up on, so the GM's version, sent under an older number of ours, can win.
- A **deletion is a fresh change**: it is sent under `next()`, never under the piece's last change
  number. (On 11-11 a deletion reused the last change number; the drag to the bar had already sent
  higher-numbered moves, so the players' pages discarded it as stale.)

## Collaborators
- none

## Sequences
- seq-move.md
- seq-sync.md
