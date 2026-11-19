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
**Pulled:** 2026-11-19 — re-pulled after Item 9 rewrote judge's check of what a player may write; rang: Dana's rename of Devreux's card was taken; restored clean *Earlier —* 2026-11-13 — re-pulled after the carry rewrite: rang, Dana's rename of Devreux's card was taken (refused []) *Earlier —* 2026-11-12 — rang: Dana's rename of Devreux's card was taken
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
**Input:** the GM's table (Sam and Devreux the GM's, Beauford Ann's), Dana and Ann listening: a chip on the table, moved into Devreux's Main by the GM, back to the table, into Devreux's Main by Dana; Ann's own chip on Beauford; a tab joining as Dana; Ann's chip deleted
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

## Test: a player changes only their own row's action and dice, never its aim
**Purpose:** R375: of a player's `rows`, only their own characters' rows are taken, and of those only the action, alternative, type and hand; the aim and the White stay the GM's
**Input:** Sam (Dana's) and Beauford (Ann's) rows aimed at Devreux, White + 1; Dana's change: Sam's row Impress, impress, 1 Yellow +2, aimed at Beauford, Green; Beauford's row Shoot
**Expected:** Sam's row Impress, impress, 1 Yellow +2, still aimed at Devreux, White + 1; Beauford's row still Infer
**Refs:** crc-Authority.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 7
**Fire alarm:** take a player's row whole (`...r`); red: Sam's row is aimed at Beauford
**Inject:** src/net/authority.ts:mergeRows
**Pulled:** 2026-11-16 — rang: "a player changes only their own row's action and dice" failed, Sam's row aimed at Beauford; restored clean

## Test: a player puts away their own row, never a private one or another's
**Purpose:** R383: a player's copy without their own character's row puts it away; another's row stays; a private row on their own character, which their copy never holds, stays
**Input:** rows for Sam (Dana's), Beauford (Ann's) and Devreux, given to Dana, private; Dana's change with no rows
**Expected:** Beauford's and Devreux's rows left; Sam's put away
**Refs:** crc-Authority.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 8
**Fire alarm:** never take a put-away (drop the removal loop); red: Sam's row stays
**Inject:** src/net/authority.ts:mergeRows
**Pulled:** 2026-11-16 — rang: "a player puts away their own row" failed, Sam's row stayed; restored clean

## Test: a player's Boot Hill keeps the GM's cards whole
**Purpose:** R406: a buried Info card reaches a player as "GM card", nothing else; their Boot Hill change has it put back whole by its `gm` name; leaving it out is refused; a GM card they made up is dropped
**Input:** Devreux's Info card buried; Dana's view of Boot Hill; her change adding her sticky's burial; her change with nothing; her change adding a GM card of her own
**Expected:** `{name: "GM card", records: [], gm}`; taken, the card whole and her sticky after it; refused; only the real card
**Refs:** crc-Authority.md, crc-Visibility.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 9
**Fire alarm:** take a player's GM card as they sent it (drop the `gm` branch of mergeYards); red: the card comes back masked
**Inject:** src/net/authority.ts:mergeYards
**Pulled:** 2026-11-18 — rang: "the card comes back whole" failed, the card came back masked; restored clean

## Test: a player never writes a record, however much is revealed
**Purpose:** R410, R435: a player's change to an Opinion Record is refused even when every line of it is revealed, so their view is the record itself; and to the Connection Table
**Input:** Devreux's record of Sam, `Grudge -Min`, its one line shown; Dana's change rewriting it to `Grudge +Exq`; Dana's change to the Connection Table
**Expected:** both refused; the record unchanged
**Refs:** crc-Authority.md
**Code:** `src/net/authority.test.ts`
**Alarm:** 10
**Fire alarm:** judge records as any other piece (drop the GM-only rule); red: Dana's rewrite is taken
**Inject:** src/net/authority.ts:judge
**Pulled:** 2026-11-19 — rang: Dana's rewrite of the record was taken; restored clean
