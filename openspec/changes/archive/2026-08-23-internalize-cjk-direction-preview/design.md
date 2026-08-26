# Design: Bounded Frontend Guidance Internalization

## Progressive Disclosure

`skill/SKILL.md` owns only routing and gate order. Detailed CJK and preview rules live in
`references/cjk-typography.md` and `references/direction-preview.md`. The deterministic receipt
validation lives in `scripts/direction-preview-core.cjs` and is exposed as `direction check`.

## Direction Receipt

Every change writes `direction-preview.json`. Required previews bind the brief, a single
`direction-previews/index.html`, a shared viewport/content/state fixture, two to four candidate axis
records, and one PNG per candidate by SHA-256. Candidate pairs must differ on four axes including
luminance or era. Selection is a second stage over the same receipt.

Waivers are closed reasons: narrow change, established surface, non-visual work, exact primary
target, or one user-fixed direction. Missing evidence never becomes a waiver.

## CJK Boundary

The contract governs system stacks, real font weights, CJK line height and measure, punctuation,
mixed-script policy, and decorative glyph subsetting. It deliberately does not import upstream
color prescriptions, aesthetic bans, preference memory, or reference-site values.

## Security and Provenance

The checker reads preview HTML and PNG bytes only for markers, IHDR dimensions, and hashes; it never
executes HTML or fetches remote assets. Every path stays within the change root after link
resolution. The third-party notice records the reviewed MIT source and the excluded upstream
surface.
