# Initial gaps

The gaps the first build of the table left open that need a ruling, not just work: a scene's end, and
the negative rows of the Con/Wis table. Opened by Bill, 2026-11-23, from gaps O2 and O3 in
`design/design.md`, with the register's look beside them.

## Status

- [x] ~~**Item 1 — End scene.**~~ **LANDED (2026-11-23 — `#58`.)** Gap O2. At Round 0, End offers to end the scene, and
      ending it recharges Motivations.
- [ ] **Item 2 — shift-click cancels an armed End.** **OPEN (not queued.)** On "End conflict?" or "End
      scene?" in the Round's window.
- [ ] **Item 3 — the Round's tab, pointed like a register's flag.** **OPEN (not queued.)**
- [ ] **Item 4 — the negative rows of the Con/Wis table.** **OPEN (not queued.)** Gap O3.
- [x] ~~**Item 5 — End's tooltip says how to end only the Conflict.**~~ **LANDED (2026-11-23 — `#59`.)** At Round 0, ▲ to
      Round 1 first, then End.

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
- **The Round's tab is pointed** (Item 3): as the flags in the picture, a white card whose top edge rises
  to a point in the middle, a gable, with the number below (confirmed below).

DECIDED (Bill, 2026-11-23), on Daneel's questions when the carve started:

- **Ending a scene does what ending a Conflict does, and recharges Motivations** ("Every scene (keep
  11-12)", Item 1). The books end at a Scene's end what End conflict ends: Damage recharges "at the end of
  each Contest or Scene" (Hollow Folks), Convictions and Burdens deplete "until the end of the Scene"
  (Bunkum), and CRIT! lasts "until the end of the Scene" (Hollow Folks). Motivations recharge every scene,
  Bill's 11-12 ruling kept over Bunkum's "At the end of the Event" (R262); Opinion Records keep their
  parentheses until an Event's end, which the table doesn't have yet.
- **The Round's tab has a pointed top, a gable** ("Pointed top (a gable)", Item 3).
- **The negative rows: Mild, then Mild and Min** ("Mild, then Mild and Min", Item 4). At Con or Wis −1 a
  Mild Slot of that column absorbs only 1 point, not 2; at −2 its Mild and Min Slots each absorb only 1.
  Read from the export's flattened row, which holds "Worth only 1" once at −1 and twice at −2 in the order
  Mild, Min, Sig, Absorption; the PDF wasn't readable here.

DECIDED (Bill, 2026-11-23), after Item 1: "In Round 0, to end the conflict but not the scene, the GM can
raise it to Round 1 and then end it", noted on End's tooltip ("Yes, let's do the tooltip"), not on the
"End scene?" tab, which holds two words and rises only after the first press (Item 5).

## Built

- **Item 1, as `#58`** (2026-11-23; R492, gap O2 resolved): the register arms with "End scene?" when the
  Round is 0 (the offer kept from the first press, so a Round stepped between the presses changes
  nothing), and the second press checkpoints "End of scene" and runs `ended(game, true)`: all that ending a
  Conflict does, and every character's Motivations recharged by `Tap.rechargeMotives` (R262, uncalled
  until now).
- **Item 5, as `#59`** (2026-11-23; R493): End's tooltip adds "(▲ to Round 1 first to end only the
  Conflict)"; the register's browser test checks it, and fails with the hint removed.

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

- None: Items 1, 3 and 4 were answered when the carve started (the decisions above).
