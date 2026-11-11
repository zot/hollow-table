# Db
**Requirements:** R130

A small interface over the browser's database, so the store is testable without a browser.

## Knows
- Stores by name, keyed by string or `[string, string]`.

## Does
- tx(stores, mode, fn): one transaction; everything `fn` does lands together or not at all.
- get, put, del, keys(prefix), all(prefix) inside a transaction.
- IdbDb: the IndexedDB implementation (database `hollow-table`).
- MemoryDb: an in-memory implementation for tests, with the same transaction semantics.

## Collaborators
- none

## Sequences
- seq-save.md
