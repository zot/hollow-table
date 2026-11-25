# Visibility
**Requirements:** R143-145, R150, R185, R313, R341, R348, R356-359, R377, R378, R381, R394, R399, R406, R410, R427, R435, R464, R501, R508, R581

Who may read what, and each record as a given viewer may see it. Pure. The invariant it serves: no
page ever holds, in the clear, a secret its person may not read.

## Knows
- Viewer: `{name, gm}`; `null` for someone who owns nothing.

## Does
- (R464) a flag on a card the viewer can't read keeps only its `why`: everyone sees it, not where its
  Levels came from.
- canSee(viewer, character): the GM always; an open character, everyone; otherwise its owner.
- contribution(item, characters) (R358): whether a chip or card in a pool is a contribution: a chip
  whose `by` is set and isn't the pool character's owner; a card whose home character has another
  owner than the pool's.
- redact(record, viewer, characters): the record as that viewer may see it, or nothing when they may
  not see it at all.
  - A chip or card in a pool whose character the viewer can't see, that isn't a contribution and isn't
    in its Stagger slot: nothing (the private mat, R378). Stagger is always seen (R377).
  - A character it can't see: `front` and `back` blanked to their shape, but for each line holding
    entries in `shown` (MarkReader.entries), written as its label and those entries joined by commas,
    in the line's first mark, and the ITEMS heading over a revealed Item; `shown` goes too, holding
    only revealed words (R394). So blankFront(c) is the same applied twice, and draws a face-down card
    the same on every page. The first line is blanked like the rest: it holds more than the public
    name ("Samuel Diamond, Rank 3"). Its Info cards keep their number, each with only its clues in
    `shown` in words and every other line blank (R399).
    Otherwise lines kept, text gone; Damage
    slots unnamed and waiting for nothing (R313), boxes unchecked, nothing spent, absorb 0, and no
    Conviction or Burden, R341).
  - An Influence card whose `home` it can't see: name gone; points gone unless the card is in a
    pool slot (a contribution's value is public, R358).
  - A burial in Boot Hill: each record in it redacted the same way; an Info card's burial, for anyone
    but the GM, is `{name: "GM card", records: []}` (R406).
  - Paper naming who reads it (R501): the GM, its maker and those in `to` see it whole; anyone else
    nothing at all. `mine` paper is never sent, so it is only ever its maker's. A `handed` note (R581)
    goes to its owner's page alone, a player's; none goes to a player's page for the GM's.
  - (R508) In a burial, records a viewer can't read are left out, and a burial holding nothing but
    paper they can't read is left out whole.
  - The world's number (R348): for anyone but the GM, `{set, total: 0}`: whether the tray is set,
    never its number.
  - The roll rows (R381): a row with the GM's private switch on is left out for anyone but the GM.
  - Everything else unchanged.
- redact gives no Connection Table (R410) to anyone but the GM, and an Opinion Record (R435) only once
  a line of it is revealed: then its `shown`, `on`, `name`, holder and of, and its text with every
  line not in `shown` blank. Authority's judge refuses any player's change to either.
- differs(record, viewer, characters): whether a viewer's view differs from the redacted-for-nobody
  view (so the network knows what to seal for them).

## Collaborators
- Records

## Sequences
- none
