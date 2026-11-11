# Mockup tests (throwaway scripts, proto test specs)

The networked ones (slice 1 on) need the internet: pages meet through public Nostr relays
(net/wire.js), then talk directly. No IPFS daemon since 11-11.

Each script drives the mockup in Chrome over CDP and prints labelled results to compare against
the expectations written beside them. They are not assertions yet.

    cd ~/work/HollowStuff/hollow-table && python3 -m http.server 8765 --bind 127.0.0.1 &
    flatpak run com.google.Chrome --headless=new --remote-debugging-port=9333 \
      --user-data-dir=$HOME/.cache/mockup-chrome --no-first-run about:blank &
    node tests/tap.cjs /tmp        # the argument is where screenshots go

They use the Playwright module from `~/work/HollowStuff/HollowWorld/node_modules`, because
Playwright's own Chromium lacks system libraries on the Deck, and they reach the page over HTTP
because flatpak Chrome can't read `file://` under home.

- `nodiff.cjs` — players see their side, the opponent's name, and the dice, not the Difference
- `identity.cjs` — only a real GM sees "You are"; player pages are fixed (`?as=Player%201`)
- `doom.cjs` — Boot Hill: two shift-clicks delete an item, or a whole graveyard, forever
- `tape.cjs` — the paper tape: printing, rolling up, tearing off, burying a torn receipt
- `poolclick.cjs` — clicking a pool adds +2, shift-click −2
- `seat.cjs` — your seat (view, roll row, tape, open lists) survives reload, per viewer, and never touches the game records
- `persist.cjs` — the write-through store: reload, images, checkpoints and undoing a restore, End, export/import, new game
- `aim.cjs` — pointing at an opponent: Defend chooser, Stagger, auto row, hand-pick hold, hidden opponents
- `highlight.cjs` — the marker swish on the action in use
- `bonuspool.cjs` — live roll row: action + Bonus pool, regrouping, hand adjustments
- `actions.cjs` — action-line parsing (Bill's grammar), die buttons, filling the roll row, typed lines
- `merge.cjs` — taps merge into resource-made cards in drawers, pools, and across characters
- `owner.cjs` — GM / open / player ownership: claiming, opening, taking back, visibility, docking
- `roller.cjs` — roll row docking, the Difference menu, used cards, sweep and restore, register and End
- `yards.cjs` — graveyards: bury into current, ‹ ›, create, rename, reclaim, scrolling panel
- `boothill.cjs` — putting away buries characters (both halves) and notes; dragging them back out
- `newchar.cjs` — the character supply pops a pool; pools stay below the bar
- `follow.cjs` — pools bring their cards, free cards, gathered cards track drawer growth
- `infl.cjs` — Influence cards, drawers, piles, kill box, click/shift-click, rehoming
- `tap.cjs` — Resource tapping and ledgers, Bias boxes, secrecy and claiming, card↔mat linking (its "card drag moved mat too" line predates the inversion: now the card moves alone)
- `rollup.cjs`, `click.cjs` — Roll Up chains and click-through on mats (older)
- `dbl.cjs`, `lower.cjs` — **stale**: double-click raising/lowering was replaced by click/shift-click
- `sync.cjs` — slice 3, two pages: the GM's table reaches the player's copy; drags show on both;
  a player's chip drop and sticky text reach the GM's page; a refused move is put back; the move
  actor's rules; a reload shows the copy at once, then syncs.
- `clean.cjs` — `cleanPiece` strips everything runnable from a piece sent by another page.
- `wire.cjs` — the wire (11-11): two pages find each other through Trystero, prove their browsers' identities, and sync; `LOOPBACK=1` for browsers that can't resolve mDNS
- `secret.cjs` — secrets on the wire: an eavesdropper at the table (Eve, owning nothing) finds no secret words in the clear; redacted views, sealed sheets on giving a character, refused edits to redacted pieces, Boot Hill redacted
- `away.cjs` — while the GM's page is away: a lost edit goes again; changes made with the GM's page closed reach it when reopened; pending changes survive a player's reload
- `claims.cjs` — names held by browsers (net/ident.js) (an impostor sees only what anyone sees, her changes refused, the GM hands the name over); a stale copy's resurrected piece is buried again and its Boot Hill change refused, while its new piece is kept
- `two.cjs` — two players: one's catch-up doesn't set off the other's (5 changes, 5 batches)
- `images.cjs [out]` — images peer to peer: each page's images reach the other by hash; a latecomer gets them from whoever has them; one nobody has is marked missing, then shows when someone with it is back
