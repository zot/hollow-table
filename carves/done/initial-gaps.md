# Initial gaps

The gaps the first build of the table left open that need a ruling, not just work: a scene's end, and
the negative rows of the Con/Wis table. Opened by Bill, 2026-11-23, from gaps O2 and O3 in
`design/design.md`, with the register's look beside them.

## Status

- [x] ~~**Item 1 — End scene.**~~ **LANDED (2026-11-23 — `#58`.)** Gap O2. At Round 0, End offers to end the scene, and
      ending it recharges Motivations.
- [x] ~~**Item 2 — shift-click cancels an armed End.**~~ **LANDED (2026-11-23 — `#60`.)** On "End conflict?" or "End
      scene?" in the Round's window.
- [x] ~~**Item 3 — the Round's tab, pointed like a register's flag.**~~ **LANDED (2026-11-23 — `#61`.)**
- [x] ~~**Item 4 — the negative rows of the Con/Wis table.**~~ **LANDED (2026-11-23 — `#62`.)** Gap O3.
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
  and ends nothing. A long press does the same, as every shift-click has one (R14). Bill, 2026-11-23: "This
  is just a short-cut to avoid waiting for the timeout -- a QoL thing for GMs".
- **The Round's tab is pointed** (Item 3): as the flags in the picture, with the number below (settled
  below).

DECIDED (Bill, 2026-11-23), on Daneel's questions when the carve started:

- **Ending a scene does what ending a Conflict does, and recharges Motivations** ("Every scene (keep
  11-12)", Item 1). The books end at a Scene's end what End conflict ends: Damage recharges "at the end of
  each Contest or Scene" (Hollow Folks), Convictions and Burdens deplete "until the end of the Scene"
  (Bunkum), and CRIT! lasts "until the end of the Scene" (Hollow Folks). Motivations recharge every scene,
  Bill's 11-12 ruling kept over Bunkum's "At the end of the Event" (R262); Opinion Records keep their
  parentheses until an Event's end, which the table doesn't have yet.
- **The Round's tab has a pointed top** ("Pointed top (a gable)", Item 3). Built first as a straight gable,
  then, from a closer photo of a "$1" flag Bill sent, redrawn as the flag is: a flat top on rounded shoulders that curves up, concave, to a small tip in the middle (Bill,
  2026-11-23: "Yes, use it").
- **The negative rows: Mild, then Mild and Min** ("Mild, then Mild and Min", Item 4). At Con or Wis −1 a
  Mild Slot of that column absorbs only 1 point, not 2; at −2 its Mild and Min Slots each absorb only 1.
  Read from the export's flattened row, which holds "Worth only 1" once at −1 and twice at −2 in the order
  Mild, Min, Sig, Absorption; the PDF wasn't readable here.

DECIDED (Bill, 2026-11-23), after Item 1: "In Round 0, to end the conflict but not the scene, the GM can
raise it to Round 1 and then end it", noted on End's tooltip ("Yes, let's do the tooltip"), not on the
"End scene?" tab, which holds two words and rises only after the first press (Item 5).

DECIDED (Bill, 2026-11-23), on Daneel's questions when Item 4 started:

- **A slot worth only 1, tapped, gives a −1** ("A −1 chip"): Hollow Folks has each Slot absorb "its Influence
  amount" and then hold that Damage Resource, so a slot worth 1 holds 1 point. Tapped it makes a 1-point
  Influence, which a pool draws as a −1 chip, keeping its tap's refund and End's clearing (R344).
- **The back shows it** ("Yes, on the slot"): a slot worth only 1 says so beside its row, "Mild (1)".
- **Neither feeds** ("Neither feeds"): a worth-1 slot only taps into a fresh −1, and a −1 can't be fed; Roll
  Up adds it in with the rest of the pool.

## Built

- **Item 1, as `#58`** (2026-11-23; R492, gap O2 resolved): the register arms with "End scene?" when the
  Round is 0 (the offer kept from the first press, so a Round stepped between the presses changes
  nothing), and the second press checkpoints "End of scene" and runs `ended(game, true)`: all that ending a
  Conflict does, and every character's Motivations recharged by `Tap.rechargeMotives` (R262, uncalled
  until now).
- **Item 2, as `#60`** (2026-11-23; R494): the raised tab takes Gesture's shift (a shift-click or long
  press) and lowers at once, ending nothing; its tooltip says so. The register's browser test checks it
  lowers within 1 s, well before End's own 3 s.
- **Item 3, as `#61`** (2026-11-23; R495): the Round's card is clipped by a `path()` drawn for its fixed
  38 px width: rounded shoulders, a concave rise and a small tip in the middle, after the "$1" flag; no new
  element. Tried live in the browser, "0" and "99" both fit in the glass. The register's browser test checks
  the card's clip.
- **Item 4, as `#62`** (2026-11-23; R496, R497, gap O3 resolved): `Influence.room` gives `one`, the rows worth
  only 1 (Mild at −1, Mild and Min at −2 or below), and `slotWorth` a slot's points. The absorb pages size
  each slot by it; a tap from such a slot makes a 1-point card (a pool's −1 chip) and neither feeds nor is
  fed; the back writes "Mild (1)", its Level word widening (names on such a row start a little later).
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
