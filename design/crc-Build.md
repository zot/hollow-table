# Build
**Requirements:** R196, R197, R198, R199, R200, R201

How the sources become the page, and how the page is published and tested.

## Knows
- The page is `src/index.html`, built into `dist/`.
- `package.json`: `typescript` and `esbuild` as dev dependencies, Trystero as a dependency, all at
  pinned versions; scripts `build`, `check` (`tsc --noEmit`), `test` (`node --test`), `spec`
  (Playwright).
- `tsconfig.json`: strict, `erasableSyntaxOnly`, `noEmit`, DOM and ES2022 libs.
- `build.mjs`: esbuild bundles `src/main.ts` into `dist/app.js`, copies `src/index.html` and
  `src/ui/theme.css`; stamps "dev" unless publishing.

## Does
- The page loads only its own bundle and Google Fonts; nothing else from a third party.
- `publish.sh`: builds, stamps the build time, publishes `dist/` under the IPNS key (15 s TTL), and
  waits until the test machine serves it.
- GitHub Pages serves `dist/` for players.
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
