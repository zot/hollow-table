# Folks
**Requirements:** R14, R153, R154, R158, R161, R163, R168, R293, R294

The people in the bar: a name tag each, the GM's invite, and the real GM's "You are".

## Knows
- me: this page's name, whether it is the GM's, live, and why it is offline.
- the people Presence has heard, each stale or not; on the GM's page, who holds each name (Claims).

## Does
- tags(me, people, held): the GM first, then you, then the rest alphabetically; a stale tag is
  dimmed and unlit; on the GM's page someone holding a name another browser holds is red
  (impostor); this page offline is a red "offline" tag whose title says why.
- gmName(answer, was): the GM's rename: 32 characters at most, blank is "GM", cancel keeps it.
- arrivalName(answer): an invited page's name: asked again for "GM" or blank; cancel is "Player".
- viewAsChoices(present, owners): the GM, the players present, every character's owner and the
  defaults "Player 1", "Player 2", never open.
- FolksView: draws the tags once a second and when anything changed. The GM's own tag asks for a
  new name; a red impostor tag asks, then hands the name over. The GM's invite button reads "Open
  the table", then "Copy invite"; a copy says "Copied" for about a second, or shows the link if the
  clipboard refuses; shift-click or a long press closes the table (R14). "You are", on the real GM's page only, is a tag
  that cycles to the next choice, kept in the GM's seat, and reloads the page as that person.

A player's own "not yours" tag waits on gap O6.

## Collaborators
- Presence: people, stale, status, rename, close.
- Claims: who holds a name; handOver.
- Seat: the GM's viewAs.
- BarView: the slots the tags and "You are" go in.
- Gesture: the invite's shift-click and long press.

## Sequences
- seq-join.md
