# Visibility
**Requirements:** R143, R144, R145, R150, R151, R152, R185

Who may read what, and each record as a given viewer may see it. Pure. The invariant it serves: no
page ever holds, in the clear, a secret its person may not read.

## Knows
- Viewer: `{name, gm}`; `null` for someone who owns nothing.

## Does
- canSee(viewer, character): the GM always; an open character, everyone; otherwise its owner.
- redact(record, viewer, characters): the record as that viewer may see it.
  - A character it can't see: `front` and `back` blanked to their shape (lines kept, text gone).
  - An Influence card whose `home` it can't see: name gone; points gone unless the card is in a
    pool slot (chip values in pools are public).
  - A burial in Boot Hill: each record in it redacted the same way.
  - Everything else unchanged.
- differs(record, viewer, characters): whether a viewer's view differs from the redacted-for-nobody
  view (so the network knows what to seal for them).

## Collaborators
- Records

## Sequences
- none
