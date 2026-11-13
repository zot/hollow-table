# Build
**Requirements:** R196, R197, R198, R199, R200, R201, R297, R302

How the sources become the page, and how the page is published and tested.

## Knows
- The page is `src/index.html`, built into `dist/`.
- `package.json`: `typescript`, `esbuild` and `@playwright/test` (1.56.1) as dev dependencies,
  Trystero as a dependency, all at pinned versions; scripts `build`, `check` (`tsc --noEmit`), `test`
  (`node --test`), `spec` (Playwright).
- `playwright.config.ts` (R297): the specs in `tests/`, headless in Playwright's own Chromium and
  Firefox, four tests at a time (the Deck's cores; `HOLLOW_WORKERS` changes it), a 1400 × 840 page; it builds and serves `dist/` on port 8781 for the run, a
  test origin of its own. Each test's pages get fresh contexts, so each has its own identity and
  database. `tests/page.ts`: open a page with the test hook and wait for it; read the game back as
  held and as saved; read localStorage; a person (a fresh context with a name, the local relay and
  the loopback); the GM's table and its invite; a player joining and synced.
- `tests/relay.ts` (R297): the local Nostr relay the spec run starts on port 8782: EVENT
  acknowledged and passed to matching subscriptions (kind, `#x`, since), REQ answered with EOSE
  (nothing stored), CLOSE. `npm run spec:public` runs the one spec through the public relays.
- `tsconfig.json`: strict, `erasableSyntaxOnly`, `noEmit`, DOM and ES2022 libs.
- `build.mjs`: esbuild bundles `src/main.ts` into `dist/app.js`, copies `src/index.html` and
  `src/ui/theme.css`; stamps "dev" unless publishing, which sets the stamp (`HOLLOW_STAMP`) and
  builds into a folder of its own (`HOLLOW_OUT`), so `dist/` keeps saying "dev".

## Does
- The page loads only its own bundle and Google Fonts; nothing else from a third party.
- `publish.sh` (R200): builds stamped with the time into a temporary folder, adds it (pinned, and
  mirrored in the node's Files as `/hollow-table`), makes the key `hollow-table` if it's missing,
  publishes under it with a 15 s TTL in the background, prints the key's subdomain link, and polls
  this machine's gateway for up to 90 s (`WAIT`) until `app.js` carries the new stamp. `IPFS` names
  the binary; otherwise it is on the path or in IPFS Desktop's AppImage.
- GitHub Pages (R199, R302): `.github/workflows/pages.yml`, on every push to `main`: `npm ci`, the
  type check and the unit tests, then `build.mjs` into `site/` stamped with the commit's time (the
  committer's clock, as git records it), uploaded and deployed by GitHub's Pages actions. Served
  at `https://zot.github.io/hollow-table/`. The committed `dist/` (stamped "dev") is what local
  serving and the specs use.
- main (`src/main.ts`): assembles the page. The plain page is the GM's: GameStore opens its game, and
  `open()` makes (or reopens) this game's room: Wire, Presence, Authority, Rolls, ImageExchange.
  An invite makes a player: its copy of the room's table (GameStore.copyFor), Wire, Copy, Presence,
  Rolls, ImageExchange. The tab id is kept in sessionStorage; a native passed as a callback is
  called detached. Moves is wired with Drag, among the views.
- testHook: with `?test`, the page exposes one object, `window.hollow`, whose `ready` holds the
  page's parts (the store, the network, and the views as they land) for Playwright; without it, the
  bundle exposes nothing.

## Collaborators
- none

## Sequences
- none
