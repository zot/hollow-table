# Test Design: the table in the browser
**Source:** crc-TableView.md

One page, through the test hook. Each ports single-page mockup scripts that passed on 11-11.

## Test: pieces, pools and drag
**Purpose:** `newchar.cjs`, `follow.cjs`, `boothill.cjs`, `merge.cjs`, `infl.cjs`, `tap.cjs`,
`click.cjs`, plus narrowing: an empty pool is seven 1em strips; carrying a chip near it widens it
before the pointer reaches a slot, and the slot under the pointer doesn't move
**Expected:** as in those scripts; slot positions under the pointer unchanged during widening
**Refs:** crc-PoolView.md, crc-Drag.md, seq-drag.md
**Code:** `tests/table.spec.ts`

## Test: rolls, tape, register
**Purpose:** `roller.cjs`, `aim.cjs`, `nodiff.cjs`, `highlight.cjs`, `actions.cjs` (with marks),
`tape.cjs`, `identity.cjs`, `owner.cjs`
**Expected:** as in those scripts
**Refs:** crc-RollRow.md, crc-Tape.md, crc-Register.md
**Code:** `tests/rolls-local.spec.ts`

## Test: the quality floor
**Purpose:** every shift-click control also answers a long press; focus is visible; reduced motion
removes transitions; no text in the bar is instructions
**Input:** each control registered with Gesture; a long press on each
**Expected:** the same result as shift-click for every one
**Refs:** crc-Gesture.md, manifest-ui.md
**Code:** `tests/floor.spec.ts`
