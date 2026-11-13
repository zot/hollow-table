# Hollow Table — design

## Intent

A shared table for Hollow stories in the browser, peer to peer: the GM's page holds the game and
resolves rolls, players' pages show copies and send changes, and each page shows only what its
person may know. Written in TypeScript; the page is `src/index.html`, built into `dist/`.

## Cross-cutting Concerns

- **Records are the lingua franca** (crc-Records.md). The game is typed records; the DOM is a view
  of them. Saving, the wire, redaction, checkpoints and export all carry records, and every record
  arriving from outside (a peer, an import) passes `check` before anything reads it. Nothing from
  outside is ever parsed as HTML.
- **Marked text** (crc-MarkedText.md). Every text field is handwriting with the closed set of marks.
  Game meaning is read only from marks (crc-MarkReader.md).
- **Two tiers.** A piece of state is either the game (records, in Game) or your seat (crc-Seat.md,
  kept per game and viewer, never sent). A click done only for looking touches the seat only.
- **Who may know what** (crc-Visibility.md). Each page holds only what its person may read; the GM's
  page redacts before anything leaves it.
- **The rules are pure.** Influence, Pool, Tap, Odds, Dice, Visibility and Ownership take records and
  return values or plans; they touch no DOM, store or network, and are tested under `node --test`.
  The rules follow Hollow Folks IV; where a rule here and the book disagree, the book wins.
- **Citing the game books.** The Hollow books (*Hollow Folks*, *Glimmer*, *Bunkum*, *Bunkum
  Mission*, *A Ghoulish Problem*) are well known to this project and live outside it. Design docs
  cite them by title and section (Hollow Folks, *Damage Resources*), and an example card by the name
  on it and its book (Samuel Diamond's card, *A Ghoulish Problem*), figures included.
- **One door for change** (crc-Game.md). Every mutation of the game goes through `Game.change`,
  which checks, applies and records what changed; saving and sending read that record rather than
  diffing the table. The store reaches the database only through Db, so it is tested in memory.
- **Pure decisions, thin plumbing** in the network. Authority.judge, the move actor's rules (Moves,
  Stamps), Copy's pending and resend logic, sealing and the identity proof are tested under
  `node --test` with fakes and a fake clock (WebCrypto is in Node); browser specs prove only that
  the pages connect. Wire is the only code that knows Trystero.
- **Views render records, Drag decides drops.** A view draws from records and turns edits into
  `Game.change`; it holds no game state. Every pointer reading goes through Gesture, so each
  shift-click has its long press by construction. Drag resolves what a drop means in one ordered
  list (crc-Drag.md).
- **One carry, shown alike everywhere.** Drag carries every kind of piece one way; each frame's
  place and aim go to Hands on this page and to the room through Moves, and every other page hands
  what arrives to its own Hands. Reactions (the lit place, a drawer's gap, a pool's strip, a card
  as a chip) are drawn from the aim in each page's own layout and never sent; a move saves nothing
  (crc-Hands.md, R298-R300).
- **Erasable TypeScript only** (no enums, namespaces or parameter properties), so Node runs the
  sources and tests directly; esbuild bundles the same sources for the page.

## Artifacts

### CRC Cards
- [x] crc-Records.md → `src/model/records.ts`
- [x] crc-MarkedText.md → `src/text/marks.ts`
- [x] crc-MarkReader.md → `src/rules/readmarks.ts`
- [x] crc-Influence.md → `src/rules/influence.ts`
- [x] crc-Pool.md → `src/rules/pool.ts`
- [x] crc-Tap.md → `src/rules/tap.ts`
- [x] crc-Odds.md → `src/rules/odds.ts`
- [x] crc-Dice.md → `src/rules/dice.ts`
- [x] crc-Visibility.md → `src/rules/visibility.ts`
- [x] crc-Ownership.md → `src/rules/ownership.ts`
- [x] crc-Game.md → `src/model/game.ts`
- [x] crc-GameStore.md → `src/store/gamestore.ts`, `src/store/playtest.ts`
- [x] crc-Db.md → `src/store/db.ts`
- [x] crc-BlobStore.md → `src/store/blobs.ts`
- [x] crc-Exchange.md → `src/store/exchange.ts`
- [x] crc-Seat.md → `src/store/seat.ts`
- [x] crc-Wire.md → `src/net/wire.ts`, `src/net/link.ts`, `src/net/fakeroom.ts`
- [x] crc-Identity.md → `src/net/identity.ts`, `src/net/b64.ts`
- [x] crc-Seal.md → `src/net/seal.ts`
- [x] crc-Envelope.md → `src/net/envelope.ts`
- [x] crc-Presence.md → `src/net/presence.ts`
- [x] crc-Claims.md → `src/net/claims.ts`
- [x] crc-Stamps.md → `src/net/stamps.ts`
- [x] crc-Moves.md → `src/net/moves.ts`
- [x] crc-Hands.md → `src/ui/hands.ts`
- [x] crc-Authority.md → `src/net/authority.ts`
- [x] crc-Copy.md → `src/net/copy.ts`
- [x] crc-ImageExchange.md → `src/net/images.ts`
- [x] crc-Rolls.md → `src/net/rolls.ts`
- [x] crc-Yards.md → `src/rules/yards.ts`
- [x] crc-TableView.md → `src/ui/table.ts`
- [ ] crc-PieceView.md → `src/ui/piece.ts`
- [ ] crc-PoolView.md → `src/ui/pool.ts`, `src/ui/actions.ts`
- [x] crc-Gesture.md → `src/ui/gesture.ts`
- [x] crc-Drag.md → `src/ui/drag.ts`
- [x] crc-Pens.md → `src/ui/pens.ts`
- [ ] crc-RollRow.md → `src/ui/rollrow.ts`
- [ ] crc-Tape.md → `src/ui/tape.ts`, `src/ui/receipt.ts`
- [ ] crc-Register.md → `src/ui/register.ts`
- [ ] crc-BootHillView.md → `src/ui/boothill.ts`
- [ ] crc-Ledger.md → `src/ui/ledger.ts`
- [ ] crc-Bar.md → `src/ui/bar.ts`, `src/rules/supplies.ts`
- [x] crc-Folks.md → `src/ui/folks.ts`, `src/main.ts`
- [x] crc-Build.md → `package.json`, `tsconfig.json`, `build.mjs`, `publish.sh`, `src/main.ts`, `playwright.config.ts`, `tests/page.ts`, `tests/relay.ts`
- [ ] crc-Theme.md → `src/ui/theme.css`

### Sequences
- [ ] seq-save.md → `src/model/game.ts`, `src/store/gamestore.ts`
- [ ] seq-restore.md → `src/store/gamestore.ts`, `src/store/seat.ts`
- [ ] seq-join.md → `src/net/wire.ts`, `src/net/identity.ts`, `src/net/presence.ts`, `src/net/claims.ts`
- [ ] seq-sync.md → `src/net/authority.ts`, `src/net/copy.ts`, `src/net/stamps.ts`
- [ ] seq-edit.md → `src/net/copy.ts`, `src/net/authority.ts`
- [x] seq-move.md → `src/net/moves.ts`
- [ ] seq-roll.md → `src/net/rolls.ts`
- [ ] seq-images.md → `src/net/images.ts`
- [x] seq-drag.md → `src/ui/drag.ts`, `src/ui/pool.ts`, `src/ui/gesture.ts`

### UI Layouts
- [ ] manifest-ui.md → `src/ui/theme.css`, `src/index.html`
- [ ] ui-table.md → `src/ui/table.ts`, `src/ui/bar.ts`
- [ ] ui-pool.md → `src/ui/pool.ts`
- [ ] ui-card.md → `src/ui/piece.ts`
- [ ] ui-register.md → `src/ui/register.ts`, `src/ui/tape.ts`
- [ ] ui-ledger.md → `src/ui/ledger.ts`

### Test Designs
- [x] test-Records.md → `src/model/records.test.ts`
- [x] test-MarkedText.md → `src/text/marks.test.ts`
- [x] test-MarkReader.md → `src/rules/readmarks.test.ts`
- [x] test-Pens.md → `src/ui/pens.test.ts`
- [x] test-PoolView.md → `src/ui/pool.test.ts`
- [x] test-PieceView.md → `src/ui/piece.test.ts`
- [x] test-RollRow.md → `src/ui/rollrow.test.ts`
- [x] test-Tape.md → `src/ui/tape.test.ts`
- [x] test-Register.md → `src/ui/register.test.ts`
- [x] test-Supplies.md → `src/rules/supplies.test.ts`
- [x] test-Folks.md → `src/ui/folks.test.ts`
- [x] test-TableView.md → `src/ui/table.test.ts`
- [x] test-Influence.md → `src/rules/influence.test.ts`
- [x] test-Pool.md → `src/rules/pool.test.ts`
- [x] test-Tap.md → `src/rules/tap.test.ts`
- [x] test-Odds.md → `src/rules/odds.test.ts`
- [x] test-Dice.md → `src/rules/dice.test.ts`
- [x] test-Visibility.md → `src/rules/visibility.test.ts`
- [x] test-Ownership.md → `src/rules/ownership.test.ts`
- [x] test-Game.md → `src/model/game.test.ts`
- [x] test-Db.md → `src/store/db.test.ts`
- [x] test-Rolls.md → `src/net/rolls.test.ts`
- [x] test-Presence.md → `src/net/presence.test.ts`
- [x] test-Images.md → `src/net/images.test.ts`
- [x] test-Gesture.md → `src/ui/gesture.test.ts`
- [x] test-PoolActions.md → `src/ui/actions.test.ts`
- [x] test-GameStore.md → `src/store/gamestore.test.ts`
- [x] test-BlobStore.md → `src/store/blobs.test.ts`
- [x] test-Exchange.md → `src/store/exchange.test.ts`
- [x] test-Ledger.md → `src/ui/ledger.test.ts`
- [x] test-Seat.md → `tests/seat.spec.ts`, `src/store/seat.test.ts`
- [x] test-Stamps.md → `src/net/stamps.test.ts`, `src/net/moves.test.ts`
- [x] test-Authority.md → `src/net/authority.test.ts`
- [x] test-Copy.md → `src/net/copy.test.ts`
- [x] test-Crypto.md → `src/net/identity.test.ts`, `src/net/seal.test.ts`, `src/net/envelope.test.ts`
- [x] test-Yards.md → `src/rules/yards.test.ts`
- [x] test-Table.md → `tests/table.spec.ts`, `tests/rolls-local.spec.ts`, `tests/floor.spec.ts`, `tests/drag.spec.ts`, `tests/card.spec.ts`
- [x] test-Network.md → `tests/sync.spec.ts`, `tests/secret.spec.ts`, `tests/away.spec.ts`, `tests/deletion.spec.ts`, `tests/images.spec.ts`, `tests/rolls.spec.ts`, `tests/relays.spec.ts`

## Gaps
- [ ] O1: Checked by hand only, after 9.4.6c's browser specs (`tests/table.spec.ts`, `drag.spec.ts`, `card.spec.ts`, `rolls-local.spec.ts`, `floor.spec.ts`, which now check R215's drop, R216, R217, R220–R222, R225, R240, R241, R243, R244, R251–R253, R255, R256, R260, R268–R272, the roll row, aiming, the tape and the register): R215 frame pacing (passes against pointer events); R226 another page's move gliding; the pool's look R227–R236 and R237's pop; the card's text look R245–R250 and the big sticky R248; R254 headings on one line; R258 the Motivation pen and marks; R259 someone else's Resource glyph shaking; R263–R267 Damage entry fill, the absorb and boxes from Wis, the Attributes pen; R271 a resize keeping the view; R273 pinned paper over its card while written on; R274, R275 and R77 the roll row's look and the swish; R279–R283 receipt titles, the CRIT punch; R117's recharge after End.
- [x] O8: Resolved 11-13 (Bill: no, moving the card is fine): nothing changes; R241 pushes only what the mat covers. Was: A gathered card slides down with its growing drawer over whatever lies below it, unpushed: R241 pushes only what the mat covers. Ask Bill whether the card's area counts too.
- [ ] O2: No scene end yet (R262). Tap.rechargeMotives is built and tested, but nothing calls it: the register's End (R117) ends a Conflict, and the table has no scene. Decide with Bill when the register is built (9.4.5).
- [ ] O3: Hollow Folks' Con/Wis table has negative rows ("worth only 1" at −2 and −1) that the Markdown export garbles; Influence.room gives nothing extra below 1. Read the PDF's table and ask Bill what the negative rows do (R264, R265).
- [x] O6: Resolved 11-13: Authority.handedOver tells every page of the name where it is (a `claim` with why, or null), and FolksView draws a player's "not yours" tag (R296). Was: A player's page can't draw its "not yours" tag yet (R167, R293): Authority sends `claim` when a page is nobody, but nothing when the GM hands the name over, so the page would keep the tag until it reloads. Authority needs to say when a claim ends (after handOver, a `claim` with no why) before FolksView draws it.
- [x] O7: Resolved 11-13 (Bill: yes): a burial comes up once dragged a few pixels, and a long press arms deleting it forever (R295). Was: A burial in Boot Hill's list comes up the moment it's pressed (R120), so it has no long press for deleting forever (R14, R125): on a tablet only a whole graveyard can be deleted. Ask Bill whether a burial should come up only once dragged a few pixels, freeing the long press.
- [x] O5: Resolved in 9.4.5d (GameStore.beforeRestoring; Exchange.fileName). GameStore and Exchange predated the 10.6 harvest in two words: a restore of a "Before restoring" checkpoint nested its name, and Export turned only spaces to dashes.
- [x] O4: Resolved in 9.4.4a (rolls.ts words its receipts by R279 and numbers them per character; receipt.ts prints R279's order with the dice drawn). The receipt code predated the 10.5 harvest: `src/net/rolls.ts` titles a receipt `Sam #3: Infer` from one game-wide count and words its resolution and Level its own way ("Green + 1: 5", "12 Major"), and `src/ui/receipt.ts` prints the dice as text after the other lines. R278–R281 say otherwise; 9.4.4 reworks both as it builds the tape, where receipts first show.
- T1: R29 retired by R228 (2026-11-12 harvest 10.2: the mat keeps its width; strips pack at the right (Bill))
- T2: R224 retired by R243 (2026-11-12: a card stays a card in hand and becomes a chip only over the slots (Bill))
- T3: R30 retired by R244 (2026-11-12: the strip under the chip trades space with an empty slot instead of the whole pool widening (Bill))
- T4: R242 retired by R244 (2026-11-12: the mat no longer widens while carrying; it grows only when no slot can close, and the drawer keeps its width then (Bill))
- T5: R203 retired by R253 (Bill 11-12: a clicked column comes to the front and the columns rotate; the close-on-click-elsewhere was never built)
- T6: R204 retired by R257 (Bill 11-12: Motivations get their own mark, <mot>)
- T7: R214 retired by R264 (Bill 11-12: the absorb is based on Wis, worked out, not typed)
- T8: R257 retired by R266 (Bill 11-12: attributes get a mark, <att>)
- T9: R49 retired by R268 (Bill 11-12: shift-click at Min deletes a card too)
- T10: R51 retired by R269 (Bill 11-12: a card's Level answers clicks anywhere, and shift-click at Min deletes it)
- T11: R178 retired by R298 (moves show the piece in hand, whatever is carried (Bill 11-13: one carry for every piece))
- T12: R179 retired by R300 (a move changes no record; the drop's change places the piece)
