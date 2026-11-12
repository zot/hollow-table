# Db
**Requirements:** R130

A small interface over the browser's database, so the store is testable without a browser.

## Knows
- Stores by name, keyed by string or `[string, string]`.

## Does
- tx(stores, mode, fn): one transaction; everything `fn` does lands together or not at all.
- get, put, del, all(prefix) inside a transaction; `prefix` picks a game's `[game, …]` keys.
- IdbDb: the IndexedDB implementation (database `hollow-table`).
- MemoryDb: an in-memory implementation for tests, with the same transaction semantics (one at a
  time, landing whole), and a log of what each transaction wrote.

## Collaborators
- none

## Sequences
- seq-save.md
