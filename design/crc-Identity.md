# Identity
**Requirements:** R470, R474, R475, R477, R478

A page's lasting identity: an ECDSA P-256 key pair made once and kept, the private half
non-extractable. The GM's page uses the browser's own key (R474); each player name the browser takes
has a key of its own (R475), so a browser can seat several players, a tab each, and two tabs of one name
are one player. The id survives reloads, so names and the invite's `gm=` hold across them. Trystero
proves it (R470): the key is brought to Trystero, which signs its handshake with it.

## Knows
- Db store `identity`, in the browser's database beside the games but belonging to none of them:
  `me`, the browser's own key pair, and `['player', name]`, each player name's.
- id: the user id Trystero derives from the public key, 22 base62 characters of a SHA-256 of
  `trystero:uid:v1:` and the key's coordinates (Trystero checks that the two agree, so a drift in
  Trystero's derivation is refused at the join rather than passing unnoticed).
- ID: the shape of an id; an id of any other shape is from before Trystero proved them (R472, R473).

## Does
- load(db): the browser's own key pair, made on first use; with no database, made for this page load
  only.
- held(db, before): the player names this browser holds. The first time, with none held, the name the
  browser had before names were per tab is given a copy of the browser's own key pair, so its id holds
  (R477).
- player(db, name): that name's key pair, made the first time the name is taken here (R475).
- renamed(db, from, to): a rename taken moves the name's key pair to the new name (R478).
- trystero(): the identity Trystero is given: the id, the public key, and signing with the private
  half, which never leaves the browser.

## Collaborators
- Db

## Sequences
- seq-join.md
