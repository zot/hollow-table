# Exchange
**Requirements:** R138, R139

Export and import: a game as one readable file.

## Knows
- The file: `{format: 'hollow-table-game', version, name, records, checkpoints, blobs: {sha256:
  data URI}}`, saved as `<name>.glimmer.json`. Each image appears once.

## Does
- export(game id): the file, with every image the records and checkpoints use.
- import(file): checks `format` and every record (`Records.check`); refuses the file whole if any
  is wrong; makes a **new** game, adding "(imported)" to a name already taken; stores its images
  through BlobStore (each must hash to its name).

## Collaborators
- GameStore, BlobStore, Records

## Sequences
- none
