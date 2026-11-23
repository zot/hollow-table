# Initial gaps

The gaps the first build of the table left open that need a ruling, not just work: a scene's end, and
the negative rows of the Con/Wis table. Opened by Bill, 2026-11-23, from gaps O2 and O3 in
`design/design.md`, with the register's look beside them.

## Status

- [ ] **Item 1 — End scene.** **OPEN (not queued.)** Gap O2. At Round 0, End offers to end the scene, and
      ending it recharges Motivations.
- [ ] **Item 2 — shift-click cancels an armed End.** **OPEN (not queued.)** On "End conflict?" or "End
      scene?" in the Round's window.
- [ ] **Item 3 — the Round's tab, pointed like a register's flag.** **OPEN (not queued.)**
- [ ] **Item 4 — the negative rows of the Con/Wis table.** **OPEN (not queued.)** Gap O3.

## Decisions

DECIDED (Bill, 2026-11-23): "For O2, we can have end on turn 0 offer to end the scene. Shift-Clicking 'end
conflict' or 'end scene' in the round window should cancel the action. Also, the turn count number should
have points in the middle like in this picture" (a brass cash register whose "$1" and ".40" flags stand in
its glass case).

- **End at Round 0 ends the scene** (Item 1). With the Round at 0, pressing End raises "End scene?" in
  place of "End conflict?", and pressing it again within 3 s ends the scene. Otherwise End ends the
  Conflict, as it does now.
- **Shift-click cancels** (Item 2): shift-clicking the raised "End conflict?" or "End scene?" tab lowers it
  and ends nothing. A long press does the same, as every shift-click has one (R14).
- **The Round's tab is pointed** (Item 3): read by Daneel, to confirm with Bill, as the flags in the
  picture: a white card whose top edge rises to a point in the middle, a gable, with the number below.

## Where it stands

Checked 2026-11-23:

- **The register** (`specs/rolls.md`, "The register"): the Round is a pop-up tab with a bold number in a
  glass case, ▲ ▼ keys and End, from 0 to 99; End raises an orange "End conflict?" tab, and a second press
  within 3 s ends the Conflict: the Round back to 0, Damage recharged (Convictions and Burdens too), every
  Mild slot and the cards tapped from it cleared, the used piles emptied, "used" and CRIT! Influences
  cleared, a checkpoint first. Only the 3 s running out lowers the tab now.
- **Gap O2** (`design/design.md`): `Tap.rechargeMotives` is built and tested, but nothing calls it (R262),
  since the table has no scene.
- **Gap O3** (`design/design.md`): Hollow Folks' Con/Wis table has rows at −2 and −1 ("worth only 1") that
  the Markdown export garbles, and `Influence.room` gives nothing extra below 1 (R264, R265). The PDF's
  table needs reading.

## Open for the talk

- Item 1: whether ending a scene also does what ending a Conflict does (a scene's end would end any
  Conflict in it), or only recharges Motivations, since at Round 0 there may be no Conflict to end. And
  what else Hollow Folks or Bunkum say happens at a scene's end.
- Item 3: the tab's shape as read here, confirmed against the picture.
- Item 4: what the negative rows do, once the PDF's table is read; a rule, so Bill's ruling.
