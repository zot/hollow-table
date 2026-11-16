# Test Design: Authority
**Source:** crc-Authority.md

## Test: judge
**Purpose:** each refusal, and nothing else refused
**Input:** the playtest game; edits from Dana (holds "Dana", owns Sam): move Sam; move Beauford
(Ann's); rename Devreux's loose Influence (redacted to her); put back a sticky tombed after her
base; a Boot Hill change from a copy behind the latest; the same from an impostor "Dana"
**Expected:** taken; refused; refused; refused (deletion answered), though taken from a copy made
after the deletion; refused whole, though taken from a copy that saw Boot Hill's last change; all
refused
**Refs:** crc-Authority.md, seq-edit.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 1
**Fire alarm:** Skip the checks that the sender can see the piece as it is, before and after (drop both redaction tests): Dana's rename of Devreux's card is taken
**Inject:** src/net/authority.ts:judge
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, Dana's rename of Devreux's card was taken (refused []) *Earlier —* 2026-11-12 — rang: Dana's rename of Devreux's card was taken
## Test: out seals what differs and nothing else
**Purpose:** each tab gets sealed only the pieces it sees differently; giving Sam to Dana sends his
sheet; taking him back sends the redacted one
**Input:** two player tabs; a change to Sam's sheet; Sam given to Dana; taken back
**Expected:** Dana's box holds Sam's sheet only while he's hers; Ann's never does; the public part
never holds a secret word
**Refs:** crc-Authority.md, crc-Visibility.md, seq-sync.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 2
**Fire alarm:** Seal each tab's view of every changed piece, whether it differs or not: Ann's box holds Sam
**Inject:** src/net/authority.ts:Authority
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, every tab's box held every changed piece, Ann's held Sam *Earlier —* 2026-11-12 — rang: the GM's Sam was sealed to Dana (`authority.test.ts:73`), to Ann as well
## Test: claims
**Purpose:** the first browser to claim a name holds it, until the GM hands it over
**Input:** "Dana" from browser A twice, then from browser B; "GM" from A; Dana handed to B
**Expected:** A holds Dana; B is nobody; "GM" can't be claimed; after the hand-over B holds it and A
is nobody
**Refs:** crc-Claims.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 3
**Fire alarm:** Let a second browser claim a held name: browser B plays Dana before any hand-over
**Inject:** src/net/claims.ts:whoIs
**Pulled:** 2026-11-12 — rang: browser B played Dana before any hand-over

## Test: a name handed over
**Purpose:** R168, R296: the new holder is told it holds the name and gets its secrets; the page
on the browser that held it is told why it is nobody
**Input:** the GM's page with Dana and Ann; a tab from `b-imp` joining as Ann; the GM handing Ann to
`b-imp`
**Expected:** the `b-imp` tab told why when it came, then null, and sent sealed records; Ann's old
tab told why
**Refs:** crc-Authority.md, crc-Claims.md, crc-Envelope.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 4
**Fire alarm:** Tell every page of the name why, holder or not: the new holder's second claim is a why
**Inject:** src/net/authority.ts:Authority.handedOver
**Pulled:** 2026-11-13 — re-pulled after the carry rewrite: rang, the new holder's second claim was a why, not null *Earlier —* 2026-11-13 — rang: the new holder's second claim was a why, not null
## Test: a deletion of what a tab had only from its catch-up
**Purpose:** R171, R188, R192: what a catch-up sends has gone out, so deleting it reaches the tab and
is tombed
**Input:** Dana's tab asks for the table; the GM's page deletes the sticky, never changed before
**Expected:** Dana is sent the deletion, and the book tombs the sticky
**Refs:** crc-Authority.md
**Code:** `src/net/authority.test.ts`

## Test: the private mat on the wire
**Purpose:** R361: a piece going private is removed from the public part without a tomb; back out it is public again; a contribution is public; an owner's own chip is sealed to them alone, kept out of a catch-up's public part, and when deleted is taken away from them sealed and tombed
**Input:** the GM's table (Sam and Devreux the GM's, Beauford Ann's), Dana and Ann listening: a chip on the table, moved into Devreux's Stagger by the GM, back to the table, into Devreux's Stagger by Dana; Ann's own chip on Beauford; a tab joining as Dana; Ann's chip deleted
**Expected:** Dana gets a public put, then a removal and no second put, no tomb; Ann the put again; the public put says `by: Dana`; Ann's chip: no public put, one sealed to Ann, none to Dana; not in the late tab's public part; then a sealed removal to Ann, none public, and a tomb
**Refs:** crc-Authority.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 5
**Fire alarm:** stop sending the public removal when a piece goes private; red: Dana gets no removal
**Inject:** src/net/authority.ts:#out
**Pulled:** 2026-11-16 — rang, and again after the test was made to ask for its catch-ups: "the private mat on the wire" failed, Dana got no removal; restored clean

## Test: a player puts only their own name on a chip
**Purpose:** R360: the GM's page takes a player's chip that says it is theirs, and refuses one that says it is another's
**Input:** Dana's change putting a chip on Devreux's Stagger with `by` Dana, and with `by` Ann
**Expected:** the first taken, the second refused
**Refs:** crc-Authority.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 6
**Fire alarm:** never call a `by` forged; red: Ann's name is taken from Dana
**Inject:** src/net/authority.ts:forged
@alarm-hash: 4d3de4a4866a2199
**Pulled:** 2026-11-16 — rang: "a player puts only their own name on a chip" failed, Ann's name was taken from Dana; restored clean
