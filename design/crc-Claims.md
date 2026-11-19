# Claims
**Requirements:** R166, R167, R168, R169

On the GM's page: which browser holds which name. A page claiming a name another browser holds is
nobody until the GM hands the name over.

## Knows
- book.claims: name → browser id (saved with the game; the book is never sent, but Authority sends
  the claims to every page as `claims`, R446, since who sits in a seat is no secret).

## Does
- whoIs(game, name, browser): the name if this browser holds it or the name is free (claiming it in
  the book); nobody (null) otherwise. "GM" can't be claimed.
- handOver(game, name, browser): the GM gives the name to another browser; secrets follow the new
  holder (Authority.recheck).
- why(name): what the "not yours" chip says; Authority sends it to that tab as a `claim`.
- Every page bars the tag of a page whose name another browser holds, and the GM's strip marks it in
  red too (Folks, R445).

## Collaborators
- Game (book), Wire

## Sequences
- seq-join.md
