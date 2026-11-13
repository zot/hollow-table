# Authority
**Requirements:** R168, R170, R174, R175, R176, R185, R186, R188, R191, R192, R193, R296

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
  puts}}}`; `by` names whose number `s` is, the GM's tab when absent.

## Does
- join(tab, name, browser, sealKey): a tab said who it is (Presence's `here`); Claims decides its
  name, and a tab that is nobody is told why.
- handedOver(name) (R296): after the GM hands a name over (Claims.handOver), re-checks every record
  so the new holder gets its secrets, and sends each tab playing as that name a `claim`: why for a
  tab that is nobody, null for the holder.
- out(changed): Game's changes, gathered until the change in hand is done (`schedule`); for each
  changed rid, the redacted-for-nobody view to everyone; for each player tab
  whose view differs from what it holds, its view sealed to it, in the same batch. Deletions go out
  under a **fresh** stamp (Stamps). Also re-checks every record when a character changes hands, so
  sheets and cards follow ownership though their records didn't change.
- catchUp(tab): the whole table, to that tab only, at the current version without moving it. What it
  sends counts as gone out to everyone (where nothing had yet), so deleting it later is sent and tombed
  (R188, R192).
- judge(game, edit, who): pure. For each record in a player's change, refuses it when:
  - the sender is nobody (Claims);
  - Ownership.mayChange says no;
  - the sender can only see the piece redacted (Visibility);
  - it puts back a piece deleted after the copy it was made on (tomb newer than the edit's version);
  - it is a Boot Hill change from a copy that missed a later one (refused whole, with what was
    changed with it); a Boot Hill change it may make has what the sender sees redacted put back as
    the GM has it, and is refused if it leaves out something they couldn't read.
  Returns what to take and what to answer.
- recheck(): every record again, after a hand-over.
- take(edit): applies what judge allowed (Game.change), which sends it to everyone; a refused piece
  is answered with the GM's version, under the player's own number, so their page takes it as the
  answer.

## Collaborators
- Game, Stamps, Visibility, Ownership, Claims, Seal, Wire

## Sequences
- seq-sync.md
- seq-edit.md
