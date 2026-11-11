# Presence
**Requirements:** R155, R157, R158, R159, R161, R162, R163

Who's at the table, and the room itself.

## Knows
- role: the GM (a plain page) or a player (an invite, carrying `room` and `gm`).
- room: `<label>-<128-bit hex>`; the GM's is remembered per game (seat tier), never put in the URL.
- name: a player's, asked once per browser.
- people: tab → `{name, role, browser, live}`.
- status: off, live, or offline with why.

## Does
- open(): makes a room (GM).
- invite(): the link: this origin, `room`, and `gm=<the GM's browser id>`.
- close(): leaves the room (shift-click on Copy invite).
- greet: a newly connected peer is sent `hello` and answers `here` to that peer only; a closed
  connection removes it.
- liveness: live while a relay or a peer is reachable; offline after 15 s with neither, with why,
  and keeps trying.
- rename(): the GM's own name tag.

## Collaborators
- Wire

## Sequences
- seq-join.md
