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
- A big batch goes whole: Trystero splits an action's payload into chunks and reassembles it, up to
  Wire's `maxReceiveBytes` (checked 2026-11-12 in Trystero 0.26.0's action wire), so there are no
  parts here.

## Does
- make(kind, tab, body): an envelope `{v, kind, tab, at, body}` with this page's tab id and time.
- check(envelope): the kind's fields, types and limits; records inside pass `Records.check`;
  dice show 1 to 6. Takes an object or a JSON string; never throws.

## Collaborators
- Records: check.

## Sequences
- seq-sync.md
