# Hollow Table — design

## Intent

A shared table for Hollow stories in the browser, peer to peer: the GM's page holds the game and
resolves rolls, players' pages show copies and send changes, and each page shows only what its
person may know. Written in TypeScript, poured fresh from the specs; the mockup (`index.html`,
`net/`) is the wax it replaces.

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
- [ ] crc-Records.md → `src/model/records.ts`
- [ ] crc-MarkedText.md → `src/text/marks.ts`
- [ ] crc-MarkReader.md → `src/rules/readmarks.ts`
- [ ] crc-Influence.md → `src/rules/influence.ts`
- [ ] crc-Pool.md → `src/rules/pool.ts`
- [ ] crc-Tap.md → `src/rules/tap.ts`
- [ ] crc-Odds.md → `src/rules/odds.ts`
- [ ] crc-Dice.md → `src/rules/dice.ts`
- [ ] crc-Visibility.md → `src/rules/visibility.ts`
- [ ] crc-Ownership.md → `src/rules/ownership.ts`
- [ ] crc-Game.md → `src/model/game.ts`
- [ ] crc-GameStore.md → `src/store/gamestore.ts`
- [ ] crc-Db.md → `src/store/db.ts`
- [ ] crc-BlobStore.md → `src/store/blobs.ts`
- [ ] crc-Exchange.md → `src/store/exchange.ts`
- [ ] crc-Seat.md → `src/store/seat.ts`
- [ ] crc-Wire.md → `src/net/wire.ts`
- [ ] crc-Identity.md → `src/net/identity.ts`
- [ ] crc-Seal.md → `src/net/seal.ts`
- [ ] crc-Envelope.md → `src/net/envelope.ts`
- [ ] crc-Presence.md → `src/net/presence.ts`
- [ ] crc-Claims.md → `src/net/claims.ts`
- [ ] crc-Stamps.md → `src/net/stamps.ts`
- [ ] crc-Moves.md → `src/net/moves.ts`
- [ ] crc-Authority.md → `src/net/authority.ts`
- [ ] crc-Copy.md → `src/net/copy.ts`
- [ ] crc-ImageExchange.md → `src/net/images.ts`
- [ ] crc-Rolls.md → `src/net/rolls.ts`
- [ ] crc-Yards.md → `src/rules/yards.ts`
- [ ] crc-TableView.md → `src/ui/table.ts`
- [ ] crc-PieceView.md → `src/ui/piece.ts`
- [ ] crc-PoolView.md → `src/ui/pool.ts`
- [ ] crc-Gesture.md → `src/ui/gesture.ts`
- [ ] crc-Drag.md → `src/ui/drag.ts`
- [ ] crc-Pens.md → `src/ui/pens.ts`
- [ ] crc-RollRow.md → `src/ui/rollrow.ts`
- [ ] crc-Tape.md → `src/ui/tape.ts`
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
- [ ] test-MarkedText.md → `src/text/marks.test.ts`
- [ ] test-MarkReader.md → `src/rules/readmarks.test.ts`
- [ ] test-Influence.md → `src/rules/influence.test.ts`
- [ ] test-Pool.md → `src/rules/pool.test.ts`
- [ ] test-Tap.md → `src/rules/tap.test.ts`
- [ ] test-Odds.md → `src/rules/odds.test.ts`
- [ ] test-Dice.md → `src/rules/dice.test.ts`
- [ ] test-Visibility.md → `src/rules/visibility.test.ts`
- [ ] test-Ownership.md → `src/rules/ownership.test.ts`
- [ ] test-GameStore.md → `src/store/gamestore.test.ts`
- [ ] test-Exchange.md → `src/store/exchange.test.ts`
- [ ] test-Seat.md → `tests/seat.spec.ts`
- [ ] test-Stamps.md → `src/net/stamps.test.ts`, `src/net/moves.test.ts`
- [ ] test-Authority.md → `src/net/authority.test.ts`
- [ ] test-Copy.md → `src/net/copy.test.ts`
- [ ] test-Crypto.md → `src/net/identity.test.ts`, `src/net/seal.test.ts`, `src/net/envelope.test.ts`
- [ ] test-Yards.md → `src/rules/yards.test.ts`
- [ ] test-Table.md → `tests/table.spec.ts`, `tests/rolls-local.spec.ts`, `tests/floor.spec.ts`
- [ ] test-Network.md → `tests/sync.spec.ts`, `tests/secret.spec.ts`, `tests/away.spec.ts`, `tests/deletion.spec.ts`, `tests/rolls.spec.ts`

## Gaps
