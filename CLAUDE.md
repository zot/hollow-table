# hollow-table

A play manager for Hollow RPG stories (Glimmer, Bunkum): a shared table in the browser, peer to
peer. The GM's page holds the game; players join from an invite link and pages talk over WebRTC
(Trystero, introduced through Nostr relays). No server, nothing to install.

## Layout

Developed with mini-spec: `specs/` says what the table does (start at `specs/index.md`),
`design/` how (start at `design/design.md`: requirements, CRC cards, sequences, test designs), and
`src/` is the TypeScript, built by `build.mjs` (esbuild) into `dist/`, which is committed. Code
carries `// CRC: … | R…` comments back to the design. Read the design docs before the code.

- Every behaviour change gets a spec line and a requirement first. A change that replaces old
  behaviour rewrites or retires the old spec and design text too, so nothing describes it as live.
- Where the specs and the rule books disagree on a rule, the book wins.
- **Commit messages name carve items, not work-queue numbers.** The carves in `carves/` are in this
  repository, but the work queue and its `#N` numbers are not, so a reader of the log can't follow
  `#27`. Name the carve and its item instead ("infer reveals, Item 1: torn reveals on the card"), and
  do the same for a carve that isn't published ("prototype, Item 42: a text cursor while writing").

## Rules and table text

- The rules are the Hollow RPG books: **Hollow Folks** is the core (dice, resolution, Levels,
  Influences), and Bunkum and Glimmer build on it. Check a rule against the book, never against
  what the table happens to do.
- Words players read follow the setting. *Inside* and *Outside* are game terms, not plain English;
  characters say "this cursed land" and "back East".
- Hollow's setting is a metaphor for addiction and abuse, and the discomfort of the Powder economy
  is intentional. Don't soften it in table text.
- The table supports play rather than running it: "play as in music, not chess". The GM handling
  hidden information fairly is part of the game, which is why secrecy is enforced on the wire and
  the GM's page arbitrates, not merely hidden in the view.
- **It's a roleplaying game.** The main activity is describing what your character does, not using
  the rules or clicking. Players and the GM talk aloud, off the table; the table doesn't relay what
  voice already carries. A player describes, the GM turns that into an Action ("Give me an Infer"),
  the player picks it, and **the GM names the opposition: only the GM aims a roll**.
- **Model the physical table.** Before deciding who sees what, ask what everyone at a real table
  sees and hears. Everyone sees all the dice and hears the result, so a roll's dice, its Green, Red
  or ±1, its bonus and its outcome are public. The secrets are small: an NPC's actual values and the
  Influences others can't see, which sit behind the GM's screen.
- **Two mats.** An Influence a player puts on another character is seen by everyone (chips shoved
  across the table); the real pool, with its Roll Ups, is behind the screen, and the public mat is
  only for watching. **Stagger is always seen**: everyone can tell when the opposition is going
  off-balance, and when a Rest clears it.
- Specific first: build the concrete thing, and factor it only once it has earned it. Don't
  propose abstractions for parts nobody has played.

## Tests

- `npm test` runs the unit tests (`node --test`, a few seconds).
- `npx playwright test` runs the browser specs in `tests/`, in headless Chromium and Firefox. It builds
  `dist/`, serves it on port 8781 and starts a local relay on 8782 for the networked specs.
- The specs run **four at a time**: the machine this is developed on is a Steam Deck, with four
  cores (eight threads), and four workers took the suite from about six minutes to under two with
  nothing flaky. Every test has its own browser contexts and room, so they don't disturb each
  other. `HOLLOW_WORKERS=n` changes the count; use 1 to watch one test at a time.
- `npm run spec:public` runs the one opt-in check that the public relays still introduce pages.
- `npm run build` builds `dist/`; serve it with `python3 -m http.server <port>` from `dist/` to
  try the page. Use a port of its own for each experiment: identity and games live in the
  origin's storage, so a fresh port is a fresh browser.
- `./publish.sh` publishes a build stamped "dev" and the publish time to IPNS for testing across
  machines, under the key `hollow-table`, through the local Kubo node.

## Releases

- Work happens on **`main`**, and pushing it publishes nothing. A release is a version tag: pushing
  a `v*` tag publishes that commit to GitHub Pages (`.github/workflows/pages.yml`), and the page
  shows the tag under the wordmark with the release's day under it; a local build says just "dev".
- A release, once `npx tsc --noEmit`, `npm test` and `npx playwright test` all pass:
  1. `git tag -a vX.Y.Z -m "<what's new>"`, versions as `v0.1.0` (semantic: the minor for
     features, the patch for fixes). `git tag -l 'v*'` lists the releases.
  2. `git push origin main vX.Y.Z` (the tag's push publishes).
  3. Watch the Pages run. If its deploy fails with "No artifacts named github-pages", start a fresh
     run on the tag (`gh workflow run pages.yml --ref vX.Y.Z`); re-running the failed job uploads a
     second artifact and fails again.
- The repository's `github-pages` environment lets tags matching `v*` deploy, and the branch `main`
  (Settings → Environments); without the tag rule a release's run is refused.
- `v0.1.0` is the first release: the TypeScript pour, as first served on Pages. `v0.2.0` is the
  first to show its version and date under the wordmark. (Those two were cut while work went on a
  `dev` branch, so `v0.2.0` is a merge commit; work moved back to `main` the same day.)
