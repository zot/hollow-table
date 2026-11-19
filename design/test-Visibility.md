# Test Design: Visibility
**Source:** crc-Visibility.md

## Test: no secret survives redaction
**Purpose:** a redacted record holds none of its secret words
**Input:** the playtest scene plus a card tapped from Devreux's Saloon Gossip, and Devreux holding a
Sig Bias `Mistrusts the law` with a Level spent, a Conviction `Sheriffs lie` (R341), and Bias absorb 2; viewers nobody, Dana (owning Sam), the GM; secret
words taken from each character's sheet (front, Damage slots, Convictions and Burdens, notes), Influence names and tap ledgers;
Devreux buried with its cards
**Expected:** for each viewer, every record they can't read contains none of its secret words, and
a hidden back's Damage slots are unnamed, unspent and unchecked, its absorb 0, and it has no `lasting`;
the GM's view is unchanged
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 1
**Fire alarm:** Keep the tap ledger on a redacted card (drop the `tap` removal): nobody sees `Saloon` (Saloon Gossip)
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-19 — re-pulled after R464 (redactPiece changed): rang; restored clean *Earlier —* 2026-11-19 — re-pulled after Item 9 rewrote redactPiece; rang: the tap ledger reached Dana; restored clean *Earlier —* 2026-11-12 — rang: nobody saw `Saloon` on the redacted card's tap ledger
## Test: what stays public
**Purpose:** names, places, drawer counts and chip values in pools survive
**Input:** Devreux's Influence in Sam's Stagger, viewed by Dana
**Expected:** points shown, name gone; Devreux's name and place shown
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 2
**Fire alarm:** Blank points in pool slots too (drop the `inSlot` exception): Devreux's card in Sam's Stagger shows 0 instead of 4
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-19 — re-pulled after R464 (redactPiece changed): rang; restored clean *Earlier —* 2026-11-19 — re-pulled after Item 9 rewrote redactPiece; rang: a card in a pool slot showed 0; restored clean *Earlier —* 2026-11-12 — rang: Devreux's card in Sam's Stagger showed 0 instead of 4
## Test: a hidden back hides its Conviction
**Purpose:** R341: a back its viewer can't read says nothing of its Conviction or Burden, not even that it has one
**Input:** Devreux's Conviction `Sheriffs lie`, as nobody and Dana see it
**Expected:** no `lasting` on the redacted back, and no `Sheriffs` anywhere in it
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 3
**Fire alarm:** in blankBack, keep the back's `lasting` (spread `b` first); red: nobody sees `Sheriffs lie` fails
**Inject:** src/rules/visibility.ts:blankBack
@alarm-hash: 8f35cb09e2d6ee2b
**Pulled:** 2026-11-15 — rang: "no secret survives redaction" failed, a hidden back kept `Sheriffs lie`; restored clean

## Test: the world's number is the GM's alone
**Purpose:** R348: anyone but the GM gets `{set, total: 0}`; the GM's view differs, so it is sealed for the GM's tabs only
**Input:** the world `{set: true, total: 4}`, redacted for Dana, for nobody, and for the GM
**Expected:** `{set: true, total: 0}` twice; the GM's unchanged; differs for the GM, not for Dana
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 4
**Fire alarm:** drop the world's redaction; red: Dana's view keeps 4
**Inject:** src/rules/visibility.ts:redact
**Pulled:** 2026-11-15 — rang: "the world's number is the GM's alone" failed, Dana's view kept 4; restored clean

## Test: two mats: the private one reaches only its owner and the GM
**Purpose:** R358, R378: a chip in a pool is a contribution only when someone other than its character's owner put it there, a card when its home has another owner; contributions are public, the private mat absent (not face-down) to anyone but the owner and the GM, in a burial too
**Input:** chips in Devreux's Main by the GM, by Dana, with no `by`; in Sam's by the GM and by Dana (Sam is Dana's); Devreux's card in his own Main, Sam's in Devreux's; a burial of Devreux with the GM's chip
**Expected:** contributions false, true, false, true, false; the GM's own chip absent for nobody, Dana and Ann, whole for the GM; Dana's and the GM's-on-Sam whole for Ann; Dana's own on Sam absent for Ann, whole for Dana; Devreux's card absent for Dana; Sam's face-down with its points for Ann; the burial holds only the character for Dana
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 5
**Fire alarm:** keep the private mat face-down instead of absent (drop the early `return undefined` for it); red: the GM's own chip reaches Dana
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-19 — re-pulled after R464 (redactPiece changed): rang; restored clean *Earlier —* 2026-11-19 — re-pulled after Item 9 rewrote redactPiece; rang: the GM's own chip reached Dana; restored clean *Earlier —* 2026-11-16 — rang: "two mats: the private one reaches only its owner and the GM" failed, the GM's own chip reached Dana; restored clean
## Test: a roll row is the table's, but not one behind the GM's screen
**Purpose:** R381: everyone sees the roll rows; a row with the GM's private switch on only the GM
**Input:** rows for Devreux (private) and Sam; redacted for Dana and for the GM
**Expected:** Dana's view holds Sam's row only; the GM's both
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 6
**Fire alarm:** send private rows to everyone (drop the filter); red: Dana's view holds Devreux's
**Inject:** src/rules/visibility.ts:redact
**Pulled:** 2026-11-16 — rang: "a roll row is the table's" failed, Dana's view held Devreux's private row; restored clean

## Test: Stagger is always seen
**Purpose:** R377: a chip in a Stagger slot reaches every page whoever put it there; the same chip in a private slot doesn't
**Input:** the GM's −2 in Devreux's Stagger, and in his Main, redacted for Dana
**Expected:** the Stagger chip whole; the Main chip absent
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 7
**Fire alarm:** treat Stagger like any private slot (drop the `stagger` exception); red: the Stagger chip is absent
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-19 — re-pulled after R464 (redactPiece changed): rang; restored clean *Earlier —* 2026-11-19 — re-pulled after Item 9 rewrote redactPiece; rang: the Stagger chip was absent; restored clean *Earlier —* 2026-11-16 — rang: "Stagger is always seen" failed, the Stagger chip absent; restored clean
## Test: an NPC card reveals only its shown entries
**Purpose:** R394: a hidden character's front reaches another viewer with only its revealed entries in words, each line as its label and those entries in its mark, an ITEMS heading over a revealed Item, the first line blanked (it holds more than the public name); `shown` goes with it; redacting again changes nothing; the GM sees all
**Input:** Devreux with `shown` holding Skills 3: Savvy and Streetwise, Keep the Peace, and Dead Man's Die; redacted for Dana, again for Dana, and for the GM
**Expected:** the same line count; four lines with words: Skills 3: Savvy, Streetwise in its mark, Keep the Peace, the Items heading, Dead Man's Die; the first line empty; no Proprietor, Profession, Preservation, Gossip or Free Token anywhere; `shown` as given; the second redaction equal; the GM's record unchanged
**Refs:** crc-Visibility.md, crc-MarkReader.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 8
**Fire alarm:** let a line with any revealed entry go out whole; red: Profession (Saloon Keeper) reaches Dana
**Inject:** src/rules/visibility.ts:blankFront
**Pulled:** 2026-11-18 — re-pulled after entries (#28): "an NPC card reveals only its shown entries" failed, Profession (Saloon Keeper) reaching Dana; restored clean

## Test: an NPC's Info cards reveal only their shown clues
**Purpose:** R399: a hidden character's Info cards each keep their place, with only revealed clues in words; redacting again changes nothing; a character with none gets no `info`
**Input:** Devreux with two Info cards and one clue of the first revealed; redacted for Dana, again, and Devreux with none
**Expected:** the first card with only that clue's line in words, the second blank; no watches, Trudy or Tracking; the second redaction equal; no `info` field
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 9
**Fire alarm:** send Info cards as they are (skip blankInfo); red: the ANY clue reaches Dana
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-19 — re-pulled after R464 (redactPiece changed): rang; restored clean *Earlier —* 2026-11-19 — re-pulled after Item 9 rewrote redactPiece; rang: the ANY clue reached Dana; restored clean *Earlier —* 2026-11-18 — re-pulled after the simplifier hoisted the shown set: "an NPC's Info cards reveal only their shown clues" failed; restored clean *Earlier —* 2026-11-18 — rang: "an NPC's Info cards reveal only their shown clues" failed, the ANY clue reaching Dana; restored clean
## Test: a record reaches a player once revealed, and only what is revealed
**Purpose:** R435: an Opinion Record with nothing shown never reaches a player; with a line shown it does, every other line blank; the GM gets it whole
**Input:** Devreux's record of Sam, `Reputation +Sig` and `Grudge -Min`; redacted for Dana with nothing shown, then with `Grudge -Min` shown (on Devreux, named Sam); for the GM
**Expected:** undefined; then the record with text `\nGrudge -Min`, its shown, on and name kept; the GM's whole
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 10
**Fire alarm:** send a revealed record whole (skip the blanking); red: Dana's text holds `Reputation +Sig`
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-19 — re-pulled after R464 (redactPiece changed): rang; restored clean *Earlier —* 2026-11-19 — rang: Dana's text held `Reputation +Sig`; restored clean
## Test: a flag is seen by all, but not where its Levels came from
**Purpose:** R464: a flag on a card the viewer can't read reaches them as its why alone
**Input:** Devreux's card flagged MIXED with `fed` from her Self-Preservation; redacted for Dana and for the GM
**Expected:** Dana gets `{why}` only; the GM the whole flag
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
**Alarm:** 11
**Fire alarm:** keep the whole flag in redaction; red: Dana gets `fed`, Self-Preservation's name with it
**Inject:** src/rules/visibility.ts:redactPiece
**Pulled:** 2026-11-19 — rang: Dana got the whole flag, fed and its source with it; restored clean
