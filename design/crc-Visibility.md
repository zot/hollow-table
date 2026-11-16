# Visibility
**Requirements:** R143-145, R150, R356-359, R185, R313, R341, R348, R378, R381, R377, R378

Who may read what, and each record as a given viewer may see it. Pure. The invariant it serves: no
page ever holds, in the clear, a secret its person may not read.

## Knows
- Viewer: `{name, gm}`; `null` for someone who owns nothing.

## Does
- canSee(viewer, character): the GM always; an open character, everyone; otherwise its owner.
- contribution(item, characters) (R358): whether a chip or card in a pool is a contribution: a chip
  whose `by` is set and isn't the pool character's owner; a card whose home character has another
  owner than the pool's.
- redact(record, viewer, characters): the record as that viewer may see it, or nothing when they may
  not see it at all.
  - A chip or card in a pool whose character the viewer can't see, that isn't a contribution and isn't
    in its Stagger slot: nothing (the private mat, R378). Stagger is always seen (R377).
  - A character it can't see: `front` and `back` blanked to their shape (lines kept, text gone; Damage
    slots unnamed and waiting for nothing (R313), boxes unchecked, nothing spent, absorb 0, and no
    Conviction or Burden, R341).
  - An Influence card whose `home` it can't see: name gone; points gone unless the card is in a
    pool slot (a contribution's value is public, R358).
  - A burial in Boot Hill: each record in it redacted the same way.
  - The world's number (R348): for anyone but the GM, `{set, total: 0}`: whether the tray is set,
    never its number.
  - The roll rows (R381): a row with the GM's private switch on is left out for anyone but the GM.
  - Everything else unchanged.
- differs(record, viewer, characters): whether a viewer's view differs from the redacted-for-nobody
  view (so the network knows what to seal for them).

## Collaborators
- Records

## Sequences
- none
