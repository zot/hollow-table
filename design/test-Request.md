# Test Design: Request
**Source:** crc-Request.md

## Test: a transfer
**Purpose:** R440: the PC rises to the Success Level by what the NPC can give; the rest is extra; a new Resource is added under the PC's Resources
**Input:** Devreux with `Money +Ext` and `Ammo +Min`, Sam with `Money +Min` and no Ammo; Major (3) for Money; Major for Ammo; Minor (1) for Money; Devreux's givable at Major
**Expected:** Money: 2 moved, 0 extra, Sam `Money +Maj`, Devreux `Money +Sig`; Ammo: 1 moved, 2 extra, Sam's Resources gaining a line `Ammo +Min`, Devreux `Ammo +0`; Minor Money refused (Sam already has Min); givable [Money, Ammo]
**Refs:** crc-Request.md
**Code:** `src/rules/request.test.ts`
**Alarm:** 1
**Fire alarm:** move the whole Success Level, not what lifts the PC to it (min(sl, NPC) in place of min(sl − PC, NPC)); red: Sam's Money becomes +Ext
**Inject:** src/rules/request.ts:transfer
**Pulled:** 2026-11-19 — rang: "a transfer" failed, the whole Success Level moved; restored clean
