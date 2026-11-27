# Folks
**Requirements:** R14, R153, R154, R158, R161, R163, R167, R168, R293, R294, R296, R445-447, R469, R476, R531, R545, R599, R600, R601, R602

The people in the bar: a name tag each, the GM's invite, and the real GM's "You are".

## Knows
- me: this page's name, whether it is the GM's, live, and why it is offline.
- the people Presence has heard, each stale or not; who holds each name: on the GM's page from
  Claims, on a player's page from the GM's last `claims` (R446).

## Does
- (R469) on a player's page their own tag renames: a click asks for the name; a refusal or the GM's
  page away is said on the tag (`said`, red, its title why) for a few seconds.
- tags(me, people, held): the GM first, then you, then the rest alphabetically; a stale tag is
  dimmed and unlit; this page offline is a red "offline" tag whose title says why; a player's page that
  is nobody (the GM's last `claim`, taken only from the GM's browser (R447), gave a why) is a red "not yours" tag saying why, until a `claim`
  with none comes (R167, R296). Offline wins over not yours. (R445) On every page, someone holding a
  name another browser holds is `impostor`, drawn barred: a band from the tag's upper right corner to
  its lower left; only the GM's page also makes it red and clickable.
- gmName(answer, was): the GM's rename: 32 characters at most, blank is "GM", cancel keeps it.
- arrivalName(answer, held): an invited page's name: asked again for "GM" or blank; cancel is
  "Player"; one of the names this browser holds, in any case, is that name as held (R476).
- viewAsChoices(present, owners): the GM, the players present, every character's owner and the
  defaults "Player 1", "Player 2", never open.
- FolksView: draws the tags once a second and when anything changed. The GM's own tag asks for a
  new name, and a player's own for theirs, on the table's question card (Ask.ask, R601); a red impostor
  tag asks (Ask.askYes), then hands the name over. The GM's invite button reads "Open
  the table", then "Copy invite"; a copy says "Copied" for about a second, or, when the clipboard
  refuses, puts the link in a line just under the button, selected, until a press elsewhere or Escape
  (R602); shift-click or a long press closes the table (R14). "You are", on the real GM's page only, is a tag
  that cycles to the next choice, kept in the GM's seat.
- switching (R599, R600, main.ts): a choice in "You are" keeps the connection (room, presence, authority,
  rolls, images, moves: none of them reads the viewer) and rebuilds the views for the new viewer. The
  current build is one record (the views, its FolksView, and the AbortController whose signal they were
  built with); a switch aborts it, puts the body back to its starting `#bar`, `#table` and `#world`, and
  builds again from the seat. The network's hooks into the views (Moves' `place` through the hands,
  Presence's `gone`, ImageExchange's redraw through the table view) and the test hook's `view` and
  `drag` read the current build, never one captured at start.
- repinned (R531, R545): after every change, Dockets.repin's puts, made as one change of this page's, so paper follows its holder; a holder counts as deleted when the book holds its tombstone or this page saw it go.

## Collaborators
- Presence: people, stale, status, rename, close.
- Claims: who holds a name; handOver.
- Seat: the GM's viewAs.
- BarView: the slots the tags and "You are" go in.
- Gesture: the invite's shift-click and long press.

## Sequences
- seq-join.md
