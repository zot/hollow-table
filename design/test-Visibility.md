# Test Design: Visibility
**Source:** crc-Visibility.md

## Test: no secret survives redaction
**Purpose:** a redacted record holds none of its secret words
**Input:** the playtest scene; viewers nobody, Dana (owning Sam), the GM; secret words taken from
each character's sheet and Influence names
**Expected:** for each viewer, every record they can't read contains none of its secret words;
the GM's view is unchanged
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`

## Test: what stays public
**Purpose:** names, places, drawer counts and chip values in pools survive
**Input:** Devreux's Influence in Sam's Stagger, viewed by Dana
**Expected:** points shown, name gone; Devreux's name and place shown
**Refs:** crc-Visibility.md
**Code:** `src/rules/visibility.test.ts`
