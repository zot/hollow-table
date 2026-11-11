# Envelope
**Requirements:** R109, R177

Every message's shape, checked field by field before anyone reads it. A message that fails any check
is dropped whole.

## Knows
- Kinds: `hello`, `here`, `bye`, `recs` (a batch from the GM's page), `sync` (ask for the whole
  table), `edit` (a player's change), `move`, `intent` (a roll request), `roll` (a roll's result),
  `crit` (a CRIT choice), `refuse`, `claim`.
- Limits: string caps, at most 40 dice per roll, 8 items per move, a batch's parts reassembled from
  pieces of at most 20,000 characters, partial batches dropped after 30 s.

## Does
- make(kind, body): an envelope with this page's tab id and time.
- check(envelope): the kind's fields, types and limits; records inside pass `Records.check`;
  dice show 1 to 6.
- parts(body) / join(part): splitting and reassembling a big batch.

## Collaborators
- Records: check.

## Sequences
- seq-sync.md
