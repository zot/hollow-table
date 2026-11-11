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

- **Players get GitHub Pages.** The repository's built files are served from GitHub Pages, so a
  player needs only a browser.
- **The test rig gets IPNS.** `publish.sh` publishes the built files under a dedicated IPNS key and
  serves them at the key's subdomain (`<key>.ipns.localhost:<port>`), never at a CID. The origin is
  what saved games and each browser's identity belong to, so a new origin every build would strand
  them. The publish stamps the build time on the page (a locally served page says "dev"), publishes
  with a 15 s TTL, and waits until the test machine's gateway serves the new build.
- Saved games and identities belong to the origin. Moving the page to another host starts everyone
  fresh; a game moves by export and import.

## Tests

- Behaviour is tested by driving the page in a real browser (Playwright), with two or more pages
  for anything networked. The page offers a test hook for this; the bundled program has no other
  globals.
