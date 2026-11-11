# Hollow Table

A play manager for Hollow RPG stories (Glimmer, Bunkum): a shared table in the browser, peer to
peer. The GM's browser holds the game. Players join with an invite link, and pages talk directly
over WebRTC (Trystero, signalled through public Nostr relays). There is no server and nothing to
install.

Status: a mockup, moved here 2026-11-11 from the HollowRpg repo.

- `index.html` is the table (one file; the DOM is the state, saved to IndexedDB).
- `net/` holds the networking:
  - `presence.js`: who's at the table.
  - `table.js`: pieces, edits, and secrets.
  - `wire.js`: Trystero.
  - `ident.js`: each browser's signing key.
  - `seal.js`: per-tab sealing.
  - `envelope.js`: the message envelope.
- `tests/` holds Playwright scripts; see `tests/README.md`.
- `publish.sh` publishes to IPNS for the test rig.
