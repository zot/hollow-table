# UI manifest
**Requirements:** R1, R2, R3, R4, R6, R7, R11, R12, R13, R17

One page, no routes. The table fills the window under the bar. Everything is paper and table
furniture; the chrome is the bar.

## Theme tokens (`src/ui/theme.css`, `:root`)

| Token | Value | Use |
|---|---|---|
| `--walnut` | `#3E2C22` + faint grain | the table surface |
| `--card` / `--card-edge` | `#FFFFFF` / `#888` | character and reference cards |
| `--sticky` | `#FFF200` | sticky notes |
| `--paper` | `#FBFAF6` | receipts, the tape, ledger pages |
| `--chip-pos` / `--chip-neg` | `#93C47D` / `#E06666` | chips (a red chip also shows its sign) |
| `--slot` | `#CFE2F3` | Bonus, Main, Edge |
| `--stagger` | `#F4CCCC` | Stagger |
| `--bias` | `#E06666` | Bias |
| `--affliction` | `#4A2F63`, lettering `#F3E9D2` | Affliction |
| `--injury` | `#D9C4A0` | Injury |
| `--oak`, `--nickel`, `--enamel` | `#8A5A2E`, `#C9CCCF`, `#C8372D` | the register |
| `--cloth` | `#2F5D3A` | the Ledger's binding |
| `--amber` | `#F0A040` | the current opponent's ring |

## Pens (marks)

| Mark | Highlight | Non-colour cue |
|---|---|---|
| `act` | `#FFD27A` | its die |
| `res` | `#BDE5A8` | its tap glyph |
| `inf` | `#A9D4F0` | dotted underline |
| `bias` | `#F4AFC0` | its tap glyph, its column |
| `aff` | `#CDB6EE` | its tap glyph, its column |
| `inj` | `#E9D3A6` | its tap glyph |
| `def` | `#D6D6D6` | double underline |
| `head` | none | Caveat bold, like the printed headings |

## Type

- **Caveat**: all handwriting (cards, stickies, loose text, headings on cards).
- **PT Mono**: reference cards, receipts, slot labels, the bar's small chrome.
- **Sancreek**: the wordmark, once.
- Sentence case everywhere; no all-caps labels.

## Global rules

- Every control is a thing at the table (R7): keys, tags, tabs, glyphs, pages. No web buttons,
  pills, dropdowns or floating panels.
- Visible focus on every control: a 2px `--amber` outline offset from the paper.
- `prefers-reduced-motion`: lifts, flips, slides and dice tumble become instant.
- Chrome (labels, slot rows, drawer tools, roll row, register, bar) is `user-select: none`.
- The slimmest DOM that draws it: one element per piece and per slot, more only where a control
  needs its own target.

## Layouts

- ui-table.md, ui-pool.md, ui-card.md, ui-register.md, ui-ledger.md
