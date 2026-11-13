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
