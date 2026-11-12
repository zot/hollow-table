# Hollow Table

A play manager for Hollow RPG stories (Glimmer, Bunkum): a shared table in the browser, peer to
peer. The GM's browser holds the game. Players join with an invite link, and pages talk directly
over WebRTC (Trystero, introduced through public Nostr relays). There is no server and nothing to
install.

Status: specified and designed, implementation starting (TypeScript).

- `specs/` — what the table does; start at `specs/index.md`.
- `design/` — requirements, CRC cards, sequences, layouts and test designs; start at
  `design/design.md`. Developed with mini-spec.
- `src/` — the TypeScript sources (built with esbuild into `dist/`).

Players will be served from GitHub Pages.
