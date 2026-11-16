# Hidden pools

Play it the way a table plays it: the GM tells a player whether their White gets a Red, a Green or a
±1, and they roll; they learn how hard it was, never the opposing pools behind it. Bill
(2026-11-16): "at the table they get to know how easy/hard it was but they don't see the NPC's
entire pools so they don't know exactly what the NPC's Skill is. Just like in real life."

Opened by Bill, 2026-11-16, in place of the eye on the White die (the prototype carve's Item 38):
"let's not do the eye open/close and hidden roll thing. But instead of that, we *should* hide chips
and influences for NPCs, except those contributed by the players."

## Status

- [x] ~~**Item 1 — the two mats on the wire.**~~ **LANDED (2026-11-16 — `#20`.)**
- [ ] **Item 2 — Roll Ups behind the screen.** **OPEN (not queued.)**
- [ ] **Item 3 — the GM aims a player's roll.** **OPEN (not queued.)**

## Decisions

DECIDED (Bill, 2026-11-16):

- **A hidden pool is any pool whose character the player can't see**: an NPC, and another player's
  character hidden from them ("this includes other players' cards as well, since they're hidden"). An
  open character's pool stays public.
- **Hidden means absent**: none of a hidden pool's own chips or cards reach the player's page, not
  even face-down, so the secret is kept on the wire and not merely out of view.
- **Every player sees every player's contributions**: "every player since we're all speaking out
  loud and shoving chips around at the table when we play locally".
- **Roll Ups are hidden information**, so a hidden pool has two chip states: "the public state,
  without rollups, which just shows what was contributed by a player" and "the private state, which
  does rollups".
- **The GM aims a player's roll**: "the GM aims, dragging over to the Quick Action, Skill, or Attribute
  that opposes the roll. This updates the acting white die menu setting on both the GM's and the
  player's pages."

DECIDED (Bill, 2026-11-16), **two mats**: "when any player puts an Influence on another character,
everyone sees it, so conceptually it goes into both pools, the public one, 'for show,' and the 'real
one' for the game mechanics. At the game table, there would be an Influence Pool mat for the NPC on
the table and another one behind the GM screen. When a player adds an Influence to an NPC pool, the
GM adds a copy privately behind their screen. Of course in our implementation we wouldn't need to
create a private copy for each influence card, we'd just reference the public one. An NPC's 'public
pools' are what is shared, the private pools are only in the GM's DB and each player's PC's own
pages, for their characters' pools."

So, in the table's terms: a **contribution** (a chip or card a player put on a character not theirs)
is a public record, on the public mat, and counts in the real pool by reference. The **private mat**
holds what the character's own side put there (the GM for an NPC, the owner for a player's
character) and the Roll Ups; it is never sent publicly, only to the GM's tabs and the owner's. The
mechanics read the private mat with the contributions. A Roll Up happens behind the screen: a
contribution it uses stays on the public mat untouched.

DECIDED (Bill, 2026-11-16): **a chip moved into a hidden pool goes private**, so it leaves the other
players' pages without being treated as deleted. **The GM sees only the private mats**; "You are"
(R153) shows the table as a player sees it.

This reverses R151, "chip values in pools are public", for hidden pools.

## Item 1

The two mats on the wire. A chip records who put it in a pool (`by`), which no chip does today; a
contribution is one put by a player on a character not theirs, or a card from a player's own
character. What a player's page receives of a pool it can't see is the public mat, the pool and its
contributions; the private mat's chips and cards never reach it, not even face-down. A record whose
public view is absent goes out sealed to the tabs that may read it, and one that becomes absent
(a chip moved into a hidden pool) leaves the other pages as a removal, not a deletion: no tomb, since
it may come back onto the table. R151 and R152 change with it. Until Item 2, a Roll Up's chip is the
private mat's, so a contribution that rolls up leaves the public mat.

## Item 2

Roll Ups behind the screen (Hollow Folks, *Influence Roll Up*): the private mat rolls up its own
chips with the contributions it refers to, and a contribution it uses stays on the public mat as it
was put, marked used only on the private side. Open: how the private side records a contribution as
taken into a Roll Up without changing the public record.

## Item 3

Today a roll row lives on its own page ("in your view only", R68), so the GM's page learns a
player's aim only when they roll, and a player can't aim at a character hidden from them ("The
player picks the action, the GM points it"). Here the player's row, its action by name, reaches the
GM's page; the GM drags from it to the opposing Quick Action, Skill or Attribute (pointing, as #13
built it), and the White setting the Difference picks shows on both pages, the player's as dice only,
never the numbers. This also answers the setting a player's page shows today against a hidden
opponent, which it computes from what it holds and so can show wrong (found in #16). Open: where the
GM sees a player's row and drags from it.
