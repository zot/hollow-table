# Copy
**Requirements:** R140, R171, R172, R173, R189, R190

A player's page: shows its copy of the GM's game, and keeps its own changes pending until the GM's
page answers them.

## Knows
- synced: whether the whole table has arrived since joining or since the GM's page came back.
- seen: the version it has seen everything up to (localStorage, per room).
- lastG: the last batch version heard.
- pending: rid → `{s, at, tries, base, group}` (sessionStorage, per tab and room).
- RESEND_MS 3 s, TRIES 5, ASK_MS 3 s, GAP_MS 1.5 s, AWAY_MS 25 s.

## Does
- start() / stop(): its clock (passed in) ticks every second: asking for the whole table every
  ASK_MS until it arrives (the stored copy shows meanwhile), resending what's due. It sends none of
  its own changes before the table arrives.
- heardGm(peer): a message from the GM's browser (the invite's `gm=`), `hello` and `here` included.
- receive(batch): opens its sealed part, replaces the redacted pieces with it, applies what is
  fresh (Stamps), skips pieces with a pending change, holds pieces in hand (Moves.hold); takes the
  round from meta; keeps its own tape. A full table also removes what the GM's table doesn't have,
  except pending new pieces. A gap in versions asks for the whole table after GAP_MS.
- send(changed): this page's changes, sealed to the GM's page, each with the version of the copy it
  was made on; marks them pending.
- answer(rid, s): the GM's page's reply under our number clears the pending entry.
- resend(): every RESEND_MS, pending changes go again as they are now, grouped as first sent and as
  old as their copy; after TRIES the GM's version wins (Stamps.forget drops this page's numbers for
  the piece) and the whole table is asked for.
- gmBack (in heardGm): a new GM key, or a message after AWAY_MS of silence: ask for the whole table,
  then send pending changes again.
- release(rid): what waited for a held piece (`held`, passed in) is checked again.

## Collaborators
- Game, Stamps, Seal, Wire, Moves, GameStore (the copy's own game)

## Sequences
- seq-sync.md
- seq-edit.md
