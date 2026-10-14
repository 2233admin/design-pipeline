## Why

While building on-demand download (#119), files fetched from upstream at the recorded revisions did
not match the bundled snapshots. The repository's `* text=auto eol=lf` rule had rewritten line
endings inside binary-looking files when they were committed: nine iart `showcase.gif` files and
four holosticker files (`logo-raw.png` and three SVGs). The iart manifest had then been regenerated
from the damaged bytes, so verification passed while the snapshot no longer matched upstream.

## What Changes

- The 13 files are restored to their upstream bytes at the recorded revisions; the iart and
  holosticker manifests (blob ids, sizes, byte counts, tree hashes) and the holosticker catalog
  content hash follow.
- `.gitattributes` stores every `skill/vendor/**/upstream/**` file without line-ending conversion;
  a source-governance test checks the attribute for every bundle.
- iart verification also rebuilds each pack's Git tree from its manifest objects and compares it
  with the tree recorded for the pack's revision, so a self-consistent snapshot that drifted from
  upstream is blocked.

## Capabilities

- `design-pipeline`: ADDED `Bundled upstream snapshots match their recorded upstream trees`.

## Impact

- Package bytes of the 13 files change to the true upstream content.
