# Envelope
**Requirements:** R109, R177

Every message's shape, checked field by field before anyone reads it. A message that fails any check
is dropped whole.

## Knows
- Kinds: `hello`, `here`, `bye`, `recs` (a batch from the GM's page), `sync` (ask for the whole
  table), `edit` (a player's change), `move`, `intent` (a roll request), `roll` (a roll's result),
  `crit` (a CRIT choice), `refuse`, `claim`.
- Each kind's body shape, built from the same combinators as `Records.check`. They are provisional
  where the module that owns the kind hasn't landed: `recs` `{g, full, puts: [{rid, s, rec, by?}],
  dels: [{rid, s, by?}], sealed: {tab: box}}`, `edit` `{box}`, `move` `{s, items: [{rid, x, y, z,
  part?}]}`, `intent`, `roll` `{n, receipt, sealed: {tab: box of {re, receipt}}}`, `crit`, `refuse`, `claim`, `here` `{name, role}`.
- Limits: string caps, at most 40 dice per roll, 8 items per move.
- @undecided: whether a big batch needs splitting into parts of at most 20,000 characters (partial
  batches dropped after 30 s), or Trystero's own chunking carries it; settled with Wire (prototype
  9.3.5), and `parts`/`join` land then if needed.

## Does
- make(kind, tab, body): an envelope `{v, kind, tab, at, body}` with this page's tab id and time.
- check(envelope): the kind's fields, types and limits; records inside pass `Records.check`;
  dice show 1 to 6. Takes an object or a JSON string; never throws.

## Collaborators
- Records: check.

## Sequences
- seq-sync.md
