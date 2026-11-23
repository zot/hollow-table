# Tapes

Each page's tape of receipts is its own; tearing it off should be too. Opened by Bill, 2026-11-23: "I think
tearing off tape should be for personal copies and not shared with other peers, so I think we need a little
bit more machinery for that so that receipts you've torn off and maybe put in boot hill don't reappear on
your peer and also don't affect what other peers see."

## Status

- [x] ~~**Item 6 — a copy of the table per name.**~~ **LANDED (2026-11-23 — `#55`.)** First: two names in one browser
      share one copy today, tape and all. Each name gets its own.
- [x] ~~**Item 1 — a torn tape is this page's own.**~~ **LANDED (2026-11-23 — `#56`.)** Torn off, it stays on the page
      that tore it and never reaches another page, nor does its burial in Boot Hill (Item 3, folded in).
- [x] ~~**Item 2 — what you tore stays torn.**~~ **LANDED (2026-11-23 — `#57`.)** Receipts you tore off don't come back to
      your tape, through a reload or the late page's catch-up.
- [x] ~~**Item 3 — burying your own torn tape.**~~ **MOVED (2026-11-23 — into Item 1.)** Where a personal torn
      tape goes when dropped on the bar, given Boot Hill is the table's.
- [x] ~~**Item 4 — the catch-up without the GM's tear.**~~ **ANSWERED (2026-11-23 — keep it: a new page gets
      the public view of what hangs on the GM's tape.)**
- [x] ~~**Item 5 — a roll the GM throws away.**~~ **ANSWERED (2026-11-23 — the GM's tear is personal, so
      players' tapes are untouched.)**

## Decisions

DECIDED (Bill, 2026-11-23): "the GM's peer behaves like any other when it comes to tearing off receipts, but
for a new peer, let's have it just transmit the public version of what's visible on the GM table. We don't
need to have the GM's peer remember and transmit the entire tape since the beginning of the game."

- **The GM tears like any page** (Item 1): the GM's torn tape stays on the GM's page.
- **A new page's catch-up is the public view of what hangs on the GM's tape**, as it is today (R466): the
  GM tearing their own copy shortens it, as a newcomer at a real table sees only what is still hanging. No
  history from the game's start is kept for it (Item 4).
- **Only a new page catches up.** A page that tore its tape and reloads isn't new, so it isn't refilled,
  which carries most of Item 2.
- **New means a new user id** (Bill, 2026-11-23: "New means a new user id, like someone sitting down"): a
  name, or the GM's browser, never seen at this table catches up. A reload isn't new, nor is a second tab
  under a name already seated; a new name is, in any tab. The GM's page already keeps the user ids seen at
  the table, as `book.claims` (each name and the user id that first claimed it), which may be how it tells.

DECIDED (Bill, 2026-11-23), on Daneel's questions when the carve started:

- **A copy per name** ("Copy per name", Item 6): a player's copy of the table is kept per room and name,
  so each name's tape, torn tapes and secrets stay its own. An existing copy goes to the name from before
  (the one keeping the browser's key); other names start fresh and catch up.
- **A torn tape is a local piece of the page's copy** (Item 1), kept off the wire as the hanging tape is.
  The Seat can't hold it (localStorage, about 5 MB; a torn roll holds up to 10,000 receipts).
- **Buried in Boot Hill, mine only** ("Boot Hill, mine only", Item 3): dropped on the bar a torn tape is
  buried as now ("Tape: N rolls"), but the burial is kept on that page alone: listed in its Boot Hill,
  never sent, and dug up only there.
- **Item 5 is answered** ("Yes, answered"): "throws away" meant the GM tearing their tape, and a tear is
  personal now, so players' tapes are untouched.
- **Old torn rolls leave players' pages** ("Off players' pages"): when the GM's page loads a game, each torn
  roll on the table becomes the GM's own local one and is removed from every other page.

DECIDED (Bill, 2026-11-23), on Daneel's questions when Item 1 started:

- **Item 3 is folded into Item 1** ("Fold Item 3 in"): a torn roll made local while its burial still went
  out whole in Boot Hill would leak by another door, so the burial is kept on the burying page in the same
  item.
- **Old buried tapes move to the GM's own Boot Hill** ("Move to GM's own"): when the GM's page loads a game,
  each torn tape buried in the shared Boot Hill becomes a burial on the GM's page alone, as the torn rolls on
  the table do, and leaves every other page's Boot Hill.
- **A page's own buried tape shows in the graveyard it went to** ("In the graveyard it went to"): listed in
  the graveyard being browsed when it was buried, after the shared burials, on that page alone. If no
  graveyard has that name any more, it shows in the first one.

Daneel's reading, on the build: a torn roll on this page is a record of its own kind of rid (`t:` and its
oid, beside the table's `o:`), kept off the wire as the tape is, and the GM's page refuses a torn roll put
on the table by any page.

DECIDED (Bill, 2026-11-23), on Daneel's questions when Item 2 started:

- **The page decides, per copy** ("The page, per copy"): nothing new on the wire, and the GM's page keeps no
  list of who has caught up. A page that asked for more would only refill its own tape with what every
  page saw.
- **A returning page fills in what it missed** ("No, fill in what was missed"): a page back after a reload
  or an absence gets the rolls made while it was gone, but never the ones it tore.

Daneel's reading, on the build: each copy's tape remembers the GM's time of the newest roll it has held,
kept through a tear. On each arrival the page asks, and takes only the receipts newer than that; a new
copy remembers none and takes all that hangs on the GM's tape. A roll made while the page was away and
since torn from the GM's tape can't come back (Item 4).

## Built

- **Item 6, as `#55`** (2026-11-23; R483–R485, R140 and R458 retired): `GameStore.copyFor(room, user, own,
  as)` keeps a name's copy as `m-<room>.<user id>`, the name keeping the browser's key keeping `m-<room>`,
  so a browser's copy from before stays with its name and a rename keeps its copy. The version seen is
  kept under the copy's id. The Ledger's Tables joined says each copy's name ("Dana at …"). In a fresh
  browser no name holds the browser's key, so every copy goes by its user id.

- **Item 1, as `#56`** (2026-11-23; R486–R489, Item 3 folded in): a torn roll is `t:<oid>`, and
  `Records.isLocal` (`book`, `tape`, `hill`, every `t:`) replaces the `LOCAL` set on every wire path:
  Authority's batches and catch-up, Copy's taking and sending, and Moves' carries. The GM's page refuses a
  torn roll put on the table (`judge`). Dropped on the bar, a torn roll is buried in this page's `hill`
  record under the graveyard's name (`Yards.buryOwn`); Boot Hill lists those after the graveyard's shared
  burials (`Yards.ownIn`, the first graveyard taking any whose name is gone), counts them, digs them up
  and deletes them. `Yards.ownTorn` makes the torn rolls and buried tapes shared before the GM's own when
  the GM's page loads a game, and `ownedTorn` does the same to a checkpoint before a restore loads it;
  the full table every arriving player gets removes them from players' pages. `deletion.spec` buries a
  sticky now, a torn roll no longer being shared.
- **Item 2, as `#57`** (2026-11-23; R490, R491, R466 retired): the tape record keeps `last`, the GM's time
  of the newest roll it held before a tear (`newestRoll`, read from `roll-` receipts, which the GM's page
  stamps), and every write of the tape keeps it. A player's page asks for the catch-up each load, when it
  first hears from the GM's page, and `#hung` takes only the receipts newer than its tape's newest, merged
  by time. Nothing changed on the wire or on the GM's page.

## Where it stands

Checked 2026-11-23, in the code:

- **The tape is local.** It is the `tape` record, which never goes over the wire (`LOCAL` in
  `src/net/authority.ts`), with one exception: the late page's catch-up (`specs/rolls.md`, R465, R466).
- **A tear is this page's own** (Item 1): the torn roll is `t:<oid>`, never sent, and its burial is kept in
  the page's `hill`. Before Item 1 a torn roll was an ordinary `o:` piece that reached every page unredacted
  (`redact` has no `tornroll` case), the GM's private rolls with it, and was buried in the shared Boot Hill.
- **A torn tape stays torn** (Item 2): a page asks on each arrival and takes only the rolls newer than the
  newest its tape has held, so a new copy catches up, a page back fills in what it missed, and what it tore
  never returns.
- **Two names in one browser shared one copy** until Item 6: a player's copy was `m-<room>`, so the names
  in one browser wrote the same `tape` record. Reproduced 2026-11-23 while building Item 6: with copies
  keyed by room, Dana reloaded with Sam's receipt on her tape.
- **The GM's tear trims everyone's catch-up.** The catch-up is the rolls on the GM's own tape "since the GM
  last tore it" (`#history` in `src/net/rolls.ts` reads the GM's tape), so the GM tearing their copy changes
  what every late page gets.

## Open for the talk

- None left for Item 2: a copy remembers the newest roll it has held (Item 2's decisions).
