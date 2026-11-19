# Request
**Requirements:** R440

Transferring a Resource with a successful Request, by Bunkum's *REQUEST ACTIONS* and Bill's rulings of
2026-11-19. Pure (`src/rules/request.ts`).

## Knows
- A Resource: a `<res>` mark on a card's front, `Name +Level`, its Levels as MarkReader reads them
  (levelsOf); names match ignoring case.

## Does
- levelOf(front, name): a card's Levels of a Resource, 0 when it has none.
- givable(npc, pc, sl): the NPC's Resources a transfer can take: those the NPC has more of than the PC,
  while the PC has less than the Success Level, by name, as the NPC writes them.
- transfer(npc, pc, name, sl): the two cards after it, the Levels moved and the extra Levels, or null
  when the Resource isn't givable. The PC's Resource rises toward the Success Level by
  min(sl − PC's Levels, NPC's Levels); the NPC's drops by the same (MarkReader.spend, written as the
  NPC wrote it, 0 at the least); the PC's rises in place, or is added as a new `<res>` line at the end
  of the PC's Resources (a "Resources" heading made when there is none). Extra is sl − PC's Levels −
  moved.

## Collaborators
- MarkReader, MarkedText

## Sequences
- none
