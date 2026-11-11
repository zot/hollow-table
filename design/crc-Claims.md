# Claims
**Requirements:** R166, R167, R168, R169

On the GM's page: which browser holds which name. A page claiming a name another browser holds is
nobody until the GM hands the name over.

## Knows
- book.claims: name → browser id (saved with the game, never sent).

## Does
- whoIs(name, browser): the name if this browser holds it or the name is free (claiming it);
  nobody otherwise. "GM" can't be claimed.
- handOver(name, browser): the GM gives the name to another browser; secrets follow the new holder.
- strip(): the pages to mark in red on the GM's strip, each with the name it wants.
- tell(tab): sends that tab a `claim` saying why it is nobody, for its "not yours" chip.

## Collaborators
- Game (book), Wire

## Sequences
- seq-join.md
