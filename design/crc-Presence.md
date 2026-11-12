# Presence
**Requirements:** R155, R157, R158, R159, R161, R162, R163, R293, R294

Who's at the table, and the room itself.

## Knows
- role: the GM (a plain page) or a player (an invite, carrying `room` and `gm`).
- room: `<label>-<128-bit hex>`; the GM's is remembered per game (seat tier), never put in the URL.
- name: a player's, asked once per browser.
- people: tab → `{name, role, browser}`, and when each tab was last heard.
- status: off, live, or offline with why.

## Does
- newRoom(label): a room name, the game's name as label (the GM's page remembers it per game).
- invite(base, room, gm): the link: the page's address with only `room` and `gm=<the GM's browser
  id>`. fromUrl(search): what an address makes a page, a player (room and GM) or the GM.
- start(): watches liveness. close(): says bye and leaves the room (shift-click on Copy invite).
- greet: a newly connected peer is sent `hello` and answers `here` to that peer only; a closed
  connection or a `bye` removes it. `here` is handed on (the GM's page joins a player to
  Authority).
- liveness: live while a relay or a peer is reachable; offline after 15 s with neither, with why,
  and keeps trying.
- heartbeat: every 10 s a page says `here` to everyone; stale(tab) once a page is unheard for 25 s
  (its tag dims), and after 60 s it is gone, as if it had left.
- rename(): the GM's own name tag.

## Collaborators
- Wire

## Sequences
- seq-join.md
