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
- [x] crc-Authority.md → `src/net/authority.ts`
- [x] crc-Copy.md → `src/net/copy.ts`
- [x] crc-ImageExchange.md → `src/net/images.ts`
- [x] crc-Rolls.md → `src/net/rolls.ts`
- [x] crc-Yards.md → `src/rules/yards.ts`
- [x] crc-TableView.md → `src/ui/table.ts`
- [ ] crc-PieceView.md → `src/ui/piece.ts`
- [ ] crc-PoolView.md → `src/ui/pool.ts`, `src/ui/actions.ts`
- [x] crc-Gesture.md → `src/ui/gesture.ts`
- [ ] crc-Drag.md → `src/ui/drag.ts`
- [x] crc-Pens.md → `src/ui/pens.ts`
- [ ] crc-RollRow.md → `src/ui/rollrow.ts`
- [ ] crc-Tape.md → `src/ui/tape.ts`, `src/ui/receipt.ts`
- [ ] crc-Register.md → `src/ui/register.ts`
- [ ] crc-BootHillView.md → `src/ui/boothill.ts`
- [ ] crc-Ledger.md → `src/ui/ledger.ts`
- [ ] crc-Bar.md → `src/ui/bar.ts`
- [ ] crc-Build.md → `package.json`, `tsconfig.json`, `build.mjs`, `publish.sh`, `src/main.ts`
- [ ] crc-Theme.md → `src/ui/theme.css`

### Sequences
- [ ] seq-save.md → `src/model/game.ts`, `src/store/gamestore.ts`
- [ ] seq-restore.md → `src/store/gamestore.ts`, `src/store/seat.ts`
- [ ] seq-join.md → `src/net/wire.ts`, `src/net/identity.ts`, `src/net/presence.ts`, `src/net/claims.ts`
- [ ] seq-sync.md → `src/net/authority.ts`, `src/net/copy.ts`, `src/net/stamps.ts`
- [ ] seq-edit.md → `src/net/copy.ts`, `src/net/authority.ts`
- [ ] seq-move.md → `src/net/moves.ts`
- [ ] seq-roll.md → `src/net/rolls.ts`
- [ ] seq-images.md → `src/net/images.ts`
- [ ] seq-drag.md → `src/ui/drag.ts`, `src/ui/pool.ts`, `src/ui/gesture.ts`

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
- [ ] test-Seat.md → `tests/seat.spec.ts`, `src/store/seat.test.ts`
- [x] test-Stamps.md → `src/net/stamps.test.ts`, `src/net/moves.test.ts`
- [x] test-Authority.md → `src/net/authority.test.ts`
- [x] test-Copy.md → `src/net/copy.test.ts`
- [x] test-Crypto.md → `src/net/identity.test.ts`, `src/net/seal.test.ts`, `src/net/envelope.test.ts`
- [x] test-Yards.md → `src/rules/yards.test.ts`
- [ ] test-Table.md → `tests/table.spec.ts`, `tests/rolls-local.spec.ts`, `tests/floor.spec.ts`
- [ ] test-Network.md → `tests/sync.spec.ts`, `tests/secret.spec.ts`, `tests/away.spec.ts`, `tests/deletion.spec.ts`, `tests/rolls.spec.ts`

## Gaps
- [ ] O1: The DOM side of dragging is checked by hand only (it needs a real page, frames and hit tests), so it waits for test-Table's browser spec in 9.4.6: R215 pacing in Drag and TableView (cancel at release, flush after the first move, the pan's flush before saving, the wheel paced; count passes against pointer events); R216 a lifted piece glued where pressed at zoom 1 and zoomed in; R217 and R226 a drop drawn where let go with no glide, and another page's move gliding; R220 the piece itself lifted out of its slot, drawer or the table and skipped by redraws while held; R221 the pointing hand while carrying; R222 the target lit; R224 a card becoming a chip centred on the pointer; R225 a tap born at the drag's start with its glyph under the pointer
