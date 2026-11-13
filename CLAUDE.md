# hollow-table

## Tests

- `npm test` runs the unit tests (`node --test`, a few seconds).
- `npx playwright test` runs the browser specs in `tests/`, in headless Chromium and Firefox. It builds
  `dist/`, serves it on port 8781 and starts a local relay on 8782 for the networked specs.
- The specs run **four at a time**: the machine this is developed on is a Steam Deck, with four
  cores (eight threads), and four workers took the suite from about six minutes to under two with
  nothing flaky. Every test has its own browser contexts and room, so they don't disturb each
  other. `HOLLOW_WORKERS=n` changes the count; use 1 to watch one test at a time.
- `npm run spec:public` runs the one opt-in check that the public relays still introduce pages.

## Branches and releases

- Work happens on **`dev`**. `main` holds only releases, each tagged with its version. Pushing a
  release's tag publishes it to GitHub Pages (`.github/workflows/pages.yml`), and the page shows
  that tag under the wordmark with the release's day under it; a local build says just "dev".
- A release, once `npx tsc --noEmit`, `npm test` and `npx playwright test` all pass on `dev`:
  1. `git switch main && git merge --no-ff dev -m "Release vX.Y.Z: <what's new>"`: one merge commit
     per release, so `git log --first-parent main` lists the releases.
  2. `git tag -a vX.Y.Z -m "<what's new>"`, versions as `v0.1.0` (semantic: the minor for
     features, the patch for fixes).
  3. `git push origin main vX.Y.Z` (the tag's push publishes), then `git switch dev`.
  4. Watch the Pages run. If its deploy fails with "No artifacts named github-pages", start a fresh
     run on the tag (`gh workflow run pages.yml --ref vX.Y.Z`); re-running the failed job uploads a
     second artifact and fails again.
- `v0.1.0` is the first release: the TypeScript pour, as first served on Pages.
