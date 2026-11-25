# Desktops
**Requirements:** R557, R558, R559, R561, R563, R593

The GM's desktops, pure: which pieces travel from desktop to desktop, and setting a desk out, as one
change of puts and deletions. No DOM.

## Knows
- a desk's desktop (`top`): the records that lie on the table while it is set out, kept while it isn't.
- a desk's spots (`spots`): where each traveler last lay on its desktop, by oid: a character's pool,
  card and whether it was gathered; paper's place.

## Does
- travelers(all) (R558): the oids that travel: characters the GM doesn't own; Influence cards whose home
  is one of them; chips and cards in their slots; paper and dockets a player made; then paper pinned to
  any traveler. Never the Connection Table nor an Opinion Record, which aren't on a desktop.
- setOut(desk, all, to) (R557, R559, R561, R563, R593; a page's reference sheet stays on its table): the desk record and the puts and deletions that set
  desk `to` out: the travelers' places kept in the leaving desk's spots, every other table piece (but the
  Connection Table and the Opinion Records) kept as its `top` and deleted, `to`'s `top` put on the table
  and emptied, and each traveler moved to its spot on `to`, if it has one. Nothing when `to` is set out.

## Collaborators
- Records: the desk record, the pieces.
- Drawers: desksOf.

## Sequences
- none
