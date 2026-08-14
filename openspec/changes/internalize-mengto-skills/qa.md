# QA

## Source completeness

- Revision: `3f4c22d10055d3fdddb17248d59d0c1b731cb8d3`
- Git tree: `3b129573b6d0f3d2a81b6b7dd60f853f8eec95b5`
- Tracked blobs: `867`
- Original blob bytes: `97,689,112`
- Skills: `127`
- Upstream executable-mode entries recorded: `9`
- Canonical byte-tree SHA-256: `dcf14a54a8346746fbd0a602e2b5c7f7e8fd75c8c990adfd46ae369d6ca441fe`
- `mengto verify` rebuilt the recorded Git tree from the object inventory and verified every local
  file against its Git blob ID with no issues.

## Focused verification

`node --test tests/mengto-skills.test.cjs` passed `4/4`, including source pins, full catalog and
Git-object integrity, explicit publication boundaries, strict search validation, CLI verification,
installed-path search behavior, and exact `Kage` routing to the clean-room case-study path.

The Kage review is pinned to `4399487d2fb42bce39c7b032fbbb50d230bf4f0b`. No source, font,
generated image, foreground artwork, or other asset from the no-license Kage repository was
imported.

## Repository and package verification

`node scripts/qa.cjs` exited `0` after the shared working tree was stable. It proved:

- every declared repository test passed;
- syntax and public CLI smoke checks passed;
- TGZ, ZIP, and checksum artifacts reproduced byte-for-byte across two package runs;
- archive resource checks included the MengTo overlay, Kage case study, manifest, verifier, and
  complete skill tree;
- isolated install, dependency self-check, installed `mengto verify`, and installed catalog search
  passed;
- QA left the repository status byte-identical.
