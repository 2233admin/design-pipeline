# QA

- `node --check skill/scripts/github.cjs`: passed.
- `node --test tests/github-workflows.test.cjs`: 3 passed.
- `node scripts/qa.cjs`: packaging, reproducible archives, isolated install, replacement guard,
  installed self-check, syntax, and installed CLI smoke passed.
- Full repository suite after the HyperFrames route correction: 401 passed, 0 failed.
- Live GitHub calls were not run because they require the user's authenticated `gh` session and
  would exercise external state unnecessarily. Help, parsing, and bounded-log behavior were
  tested locally.
