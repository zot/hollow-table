# Tapes

Each page's tape of receipts is its own; tearing it off should be too. Opened by Bill, 2026-11-23: "I think
tearing off tape should be for personal copies and not shared with other peers, so I think we need a little
bit more machinery for that so that receipts you've torn off and maybe put in boot hill don't reappear on
your peer and also don't affect what other peers see."

## Status

- [x] ~~**Item 6 — a copy of the table per name.**~~ **LANDED (2026-11-23 — `#55`.)** First: two names in one browser
      share one copy today, tape and all. Each name gets its own.
- [ ] **Item 1 — a torn tape is this page's own.** **OPEN (not queued.)** Torn off, it stays on the page
      that tore it and never reaches another page.
- [ ] **Item 2 — what you tore stays torn.** **OPEN (not queued.)** Receipts you tore off don't come back to
      your tape, through a reload or the late page's catch-up.
- [ ] **Item 3 — burying your own torn tape.** **OPEN (not queued.)** Where a personal torn tape goes when
      dropped on the bar, given Boot Hill is the table's.
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

## Built

- **Item 6, as `#55`** (2026-11-23; R483–R485, R140 and R458 retired): `GameStore.copyFor(room, user, own,
  as)` keeps a name's copy as `m-<room>.<user id>`, the name keeping the browser's key keeping `m-<room>`,
  so a browser's copy from before stays with its name and a rename keeps its copy. The version seen is
  kept under the copy's id. The Ledger's Tables joined says each copy's name ("Dana at …"). In a fresh
  browser no name holds the browser's key, so every copy goes by its user id.

## Where it stands

Checked 2026-11-23, in the code:

- **The tape is local.** It is the `tape` record, which never goes over the wire (`LOCAL` in
  `src/net/authority.ts`), with one exception: the late page's catch-up (`specs/rolls.md`, R465, R466).
- **A tear makes a shared piece.** Dragging the tape puts a `tornroll` record (`torn()` in
  `src/ui/tape.ts`) holding the tape's receipts as that page has them, and empties the tape. A `tornroll` is
  an ordinary table piece: it goes to every page, and dropped on the bar it is buried in Boot Hill, which
  every page shares, as "Tape: N rolls".
- **Nothing redacts a torn roll.** `redact` in `src/rules/visibility.ts` has no case for `tornroll`, so a
  torn roll reaches every page as the tearing page held it. The GM's tape holds each roll's full receipt
  (the late page's catch-up maps it to the GM's kept `full` view), and private rolls print on it, so a GM
  who tears their tape sends every page what its receipts show. Read from the code, not yet reproduced in a
  browser. Item 1 ends it.
- **A torn tape comes back.** A page whose tape is empty asks the GM's page once when it first hears from
  it; a page that tore its tape and reloads asks again and gets the table's view of every roll still on the
  GM's tape, its own included (`specs/rolls.md`: "A page that tore its own tape and reloads asks again, its
  tape being empty").
- **Two names in one browser shared one copy** until Item 6: a player's copy was `m-<room>`, so the names
  in one browser wrote the same `tape` record. Reproduced 2026-11-23 while building Item 6: with copies
  keyed by room, Dana reloaded with Sam's receipt on her tape.
- **The GM's tear trims everyone's catch-up.** The catch-up is the rolls on the GM's own tape "since the GM
  last tore it" (`#history` in `src/net/rolls.ts` reads the GM's tape), so the GM tearing their copy changes
  what every late page gets.

## Open for the talk

- How a page remembers what it tore, so the catch-up skips it: by receipt id, or by the newest roll torn.
