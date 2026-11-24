# Authority
**Requirements:** R168, R170, R174-176, R185, R186, R188, R191-193, R296, R300, R360, R361, R375, R383, R406, R410, R435, R442, R444, R446, R448, R460, R464, R469, R486, R506, R508, R524, R567

The GM's page as the game's keeper: sends what changed, each piece as each person may see it, and
judges every player's change. (R460) It enforces who may see and touch what; a judgment call the book leaves to
the GM isn't refused here (it is to be flagged, prototype Item 14).

## Knows
- book.gv: the table's version; every batch carries the next one. Continues across reloads and
  restores.
- book.tomb: rid → the version at which it was deleted (capped at 3,000).
- book.last (R444): rid → `{g, by}`, the version of the batch that last changed a piece and the tab
  whose change it was, the GM's page's own when not a player's (capped at 3,000, oldest dropped).
- book.floor (R448): the newest version the caps on `tomb` and `last` have dropped.
- public: rid → what went out to everyone (the redacted-for-nobody view).
- tabs: tab → `{name, browser, sealKey, holds: rid → the view it holds}`.
- origin: rid → the stamp it last went out under; a change taken from a player keeps the player's
  `{s, by}` for the batch that answers it.
- book.hillGv: the version Boot Hill last changed at.
- Records.isLocal: `book`, `tape`, `hill`, `desk` (R524), each torn roll (`t:`) and `mine` paper are each page's own and never sent,
  in a batch or a catch-up. (R486) judge refuses a torn roll put on the table from any page.
- A batch: `{g, full, puts: [{rid, s, by?, rec}], dels: [{rid, s, by?}], sealed: {tab: box of {g,
  puts, dels?}}}`; `by` names whose number `s` is, the GM's tab when absent.

## Does
- rename (R469): a tab's `rename` `{to}`: the name it holds (none: refused), Claims.renameWhy, then
  Claims.renamed; the tab is answered `{to, why}`, its name moved; the claims go out as they change.
- join(tab, name, browser, sealKey): a tab said who it is (Presence's `here`); Claims decides its
  name, and a tab that is nobody is told why.
- handedOver(name) (R296): after the GM hands a name over (Claims.handOver), re-checks every record
  so the new holder gets its secrets, and sends each tab playing as that name a `claim`: why for a
  tab that is nobody, null for the holder.
- out(changed): Game's changes, gathered until the change in hand is done (`schedule`); for each
  changed rid, the redacted-for-nobody view to everyone, or, when nobody-at-all may see it (R361), a
  removal if it had gone out, under a fresh stamp and not tombed; for each player tab
  whose view differs from what it holds, its view sealed to it, in the same batch, and a sealed
  removal for a tab that alone stops seeing it (R361). Deletions go out
  under a **fresh** stamp (Stamps). Each batch records `last` for the pieces it changed (R444), and raises `floor` to the newest entry its caps drop (R448). Also re-checks every record when a character changes hands, so
  sheets and cards follow ownership though their records didn't change.
- catchUp(tab): the whole table, to that tab only (a piece nobody may see only sealed to those who
  may, R361), at the current version without moving it. What it
  sends counts as gone out to everyone (where nothing had yet), so deleting it later is sent and tombed
  (R188, R192).
- judge(game, edit, who, tab): pure. For each record in a player's change, refuses it when:
  - the sender is nobody (Claims);
  - Ownership.mayChange says no;
  - the sender can only see the piece redacted (Visibility);
  - it is the Connection Table or an Opinion Record, which only the GM's page writes, revealed or not
    (R410, R435);
  - it puts back a piece deleted after the copy it was made on (tomb newer than the edit's version);
  - (R444) it puts or deletes a piece another tab changed after the copy it was made on (`last` newer
    than the edit's version, by a tab not the sender's);
  - it is a chip whose `by` changes to anyone but the sender (R360);
  - (R506) it is paper whose `by` isn't as before (new paper: none, or the sender; a piece dug up from
    Boot Hill: as buried), or whose `to` changes when its maker isn't the sender;
  - (R464) it drops or shrinks a card's flag: only the GM's page rules on a flag;
  - (R375) `rows` is merged, as Boot Hill's is: of a player's rows, only those of characters they own
    are taken, and of those only the action, its alternative, the type and the hand; the aim, the
    White, whether it was picked by hand and the private switch stay as the GM's page has them;
    a row of their own character missing from theirs is put away (R383), unless it is private,
    which their copy never holds;
  - (R448) it comes from a copy older than `floor`: everything in it is refused;
  - it is a Boot Hill change from a copy that missed a later one (refused whole, with what was
    changed with it); a Boot Hill change it may make has what the sender sees redacted put back as
    the GM has it, and is refused if it leaves out something they couldn't read. A GM card (R406)
    comes back whole by its `gm` name, so a player can neither change nor remove one; one they made
    up is dropped. (R442) Every record already buried is the GM's copy, whatever the player sends; a
    record in a new burial is kept only when the same change deletes its piece and that deletion is
    taken, as the GM's page holds the piece; a burial left with no records is dropped. So a player
    buries only what they may delete, and a refused deletion leaves its piece in play. (R508) Paper
    the sender can't read, which their copy never held, is kept as the GM holds it: back in the
    burial they kept, or, for a burial of nothing else, in the graveyard of its name (else the
    first) at its place.
  Returns what to take and what to answer.
- claims (R446): when the book's claims change, sends `claims` (name → browser) to everyone; a
  catch-up sends them to its tab too.
- recheck(): every record again, after a hand-over.
- mayMove(tab, rid) (R300): whether this page shows that tab's move of the piece: judge would take
  the piece, unchanged, from it. A move is never saved; the drop's change is judged like any other.
- take(edit): applies what judge allowed (Game.change), which sends it to everyone; a refused piece
  is answered with the GM's version, under the player's own number, so their page takes it as the
  answer.
- a player's change to a character's front, notes or name is refused unless Ownership.mayWrite allows it
  (R567).

## Collaborators
- Game, Stamps, Visibility, Ownership, Claims, Seal, Wire

## Sequences
- seq-sync.md
- seq-edit.md
