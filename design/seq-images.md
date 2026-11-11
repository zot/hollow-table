# Sequence: an image reaches a page that lacks it

```
Page A: BlobStore      ImageExchange (A)          Wire            ImageExchange (B)       BlobStore (B)
    |                       |                       |                     |                       |
1   |--add(file): hash----->|                       |                     |                       |
1.1 |                       |  record carries blob=sha256 (seq-sync.md)   |                       |
1.2 |                       |                       |                     |--missing hash         |
1.3 |                       |<------request(hash)---|<--------------------|                       |
1.4 |--get(hash)----------->|------bytes----------->|-------------------->|--accept if it hashes->|
1.5 |                       |                       |                     |--shows; can answer now|
2   |                       |                       |                     |--nobody has it: striped, why; ask again every 10 s
```
