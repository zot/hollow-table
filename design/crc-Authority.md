# Authority
**Requirements:** R168, R170, R174, R175, R176, R185, R186, R188, R191, R192, R193, R296, R300, R360, R361, R375, R383, R406, R410, R435, R442

The GM's page as the game's keeper: sends what changed, each piece as each person may see it, and
judges every player's change.

## Knows
- book.gv: the table's version; every batch carries the next one. Continues across reloads and
  restores.
- book.tomb: rid → the version at which it was deleted (capped at 3,000).
- public: rid → what went out to everyone (the redacted-for-nobody view).
- tabs: tab → `{name, browser, sealKey, holds: rid → the view it holds}`.
- origin: rid → the stamp it last went out under; a change taken from a player keeps the player's
  `{s, by}` for the batch that answers it.
- book.hillGv: the version Boot Hill last changed at.
- LOCAL: `book` and `tape` are each page's own and never sent.
- A batch: `{g, full, puts: [{rid, s, by?, rec}], dels: [{rid, s, by?}], sealed: {tab: box of {g,
  puts, dels?}}}`; `by` names whose number `s` is, the GM's tab when absent.

## Does
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
  under a **fresh** stamp (Stamps). Also re-checks every record when a character changes hands, so
  sheets and cards follow ownership though their records didn't change.
- catchUp(tab): the whole table, to that tab only (a piece nobody may see only sealed to those who
  may, R361), at the current version without moving it. What it
  sends counts as gone out to everyone (where nothing had yet), so deleting it later is sent and tombed
  (R188, R192).
- judge(game, edit, who): pure. For each record in a player's change, refuses it when:
  - the sender is nobody (Claims);
  - Ownership.mayChange says no;
  - the sender can only see the piece redacted (Visibility);
  - it is the Connection Table or an Opinion Record, which only the GM's page writes, revealed or not
    (R410, R435);
  - it puts back a piece deleted after the copy it was made on (tomb newer than the edit's version);
  - it is a chip whose `by` changes to anyone but the sender (R360);
  - (R375) `rows` is merged, as Boot Hill's is: of a player's rows, only those of characters they own
    are taken, and of those only the action, its alternative, the type and the hand; the aim, the
    White, whether it was picked by hand and the private switch stay as the GM's page has them;
    a row of their own character missing from theirs is put away (R383), unless it is private,
    which their copy never holds;
  - it is a Boot Hill change from a copy that missed a later one (refused whole, with what was
    changed with it); a Boot Hill change it may make has what the sender sees redacted put back as
    the GM has it, and is refused if it leaves out something they couldn't read. A GM card (R406)
    comes back whole by its `gm` name, so a player can neither change nor remove one; one they made
    up is dropped. (R442) Every record already buried is the GM's copy, whatever the player sends; a
    record in a new burial is kept only when the same change deletes its piece and that deletion is
    taken, as the GM's page holds the piece; a burial left with no records is dropped. So a player
    buries only what they may delete, and a refused deletion leaves its piece in play.
  Returns what to take and what to answer.
- recheck(): every record again, after a hand-over.
- mayMove(tab, rid) (R300): whether this page shows that tab's move of the piece: judge would take
  the piece, unchanged, from it. A move is never saved; the drop's change is judged like any other.
- take(edit): applies what judge allowed (Game.change), which sends it to everyone; a refused piece
  is answered with the GM's version, under the player's own number, so their page takes it as the
  answer.

## Collaborators
- Game, Stamps, Visibility, Ownership, Claims, Seal, Wire

## Sequences
- seq-sync.md
- seq-edit.md
