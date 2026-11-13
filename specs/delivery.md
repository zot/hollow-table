# Delivery and environment

Hollow Table is a static web page. There is no server and nothing to install: a player opens a link
and is at the table.

## Language and build

- The program is written in **TypeScript**, bundled with **esbuild** into static files (one page,
  its script, its styles), and type-checked with `tsc --noEmit`.
- Dependencies come from npm at pinned versions and are bundled in. The page fetches no code from a
  third party at run time. Fonts come from Google Fonts.
- It runs in current desktop browsers. Chrome, Edge and Firefox have played together; Safari is
  untested.

## Hosting

- **Players get GitHub Pages**, at `https://zot.github.io/hollow-table/`, so a player needs only a
  browser. Only releases are published (Bill, 11-13): work happens on a branch, `main` holds only
  releases, and each release is tagged with its version (`v0.1.0`). Pushing a release's tag
  publishes it: GitHub builds the page from that tag's sources, checks it (the type check and the
  unit tests), and serves it showing the tag as its version and the release's day as its date. A
  release that fails the checks publishes nothing. The origin, `zot.github.io`, is shared with the account's
  other Pages sites, which could read what the table keeps there; a custom domain would give it its
  own (Bill, 11-13: shared for now).
- **The test rig gets IPNS.** `publish.sh` publishes the built files under a dedicated IPNS key
  (`hollow-table`) and serves them at the key's subdomain (`<key>.ipns.localhost:<port>`), never at a CID. The origin is
  what saved games and each browser's identity belong to, so a new origin every build would strand
  them. The page it publishes says "dev" with the time of the publish under it (a page built locally says
  just "dev"), publishes
  with a 15 s TTL, and waits until the test machine's gateway (this machine's own, Bill 11-13)
  serves the new build.
- Saved games and identities belong to the origin. Moving the page to another host starts everyone
  fresh; a game moves by export and import.

## Tests

- Behaviour is tested by driving the page in a real browser (Playwright), with two or more pages
  for anything networked. The page offers a test hook for this; the bundled program has no other
  globals.
- **The specs** (Bill, 11-13) run headless in Playwright's own Chromium and Firefox, each page in
  its own browser context, so it has its own identity and database. Networked specs meet through a
  small Nostr relay the spec run starts on this machine, which a page opened with the test hook may
  be told to use instead of the public ones, so the suite runs offline; one spec meets through the
  public relays.
