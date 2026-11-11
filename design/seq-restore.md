# Sequence: restoring a checkpoint

```
GM            Ledger            GameStore                 Game              Seat        Net
 |              |                   |                       |                 |           |
1|--click cp--->|                   |                       |                 |           |
1.1             |--restore(id)----->|                       |                 |           |
1.2             |                   |--checkpoint("Before restoring …", auto) |           |
1.3             |                   |--read cp records      |                 |           |
1.4             |                   |--load(records)------->|                 |           |
1.5             |                   |                       |--all rids dirty-|---------->|
1.6             |                   |                       |                 |--prune    |
1.7             |                   |                       |                 |           |--send changes,
                |                   |                       |                 |           |  under the next gv
```

- At step 1.2, a restore can always be undone by restoring the checkpoint it made.
- At step 1.7, book.gv only moves forward, so players' copies see the restore as newer, not as a rollback.
