# Claims
**Requirements:** R166, R167, R168, R169

On the GM's page: which browser holds which name. A page claiming a name another browser holds is
nobody until the GM hands the name over.

## Knows
- book.claims: name → browser id (saved with the game, never sent).

## Does
- whoIs(game, name, browser): the name if this browser holds it or the name is free (claiming it in
  the book); nobody (null) otherwise. "GM" can't be claimed.
- handOver(game, name, browser): the GM gives the name to another browser; secrets follow the new
  holder (Authority.recheck).
- why(name): what the "not yours" chip says; Authority sends it to that tab as a `claim`.
- The GM's strip marks in red the pages whose name another browser holds (the bar, prototype 9.4).

## Collaborators
- Game (book), Wire

## Sequences
- seq-join.md
