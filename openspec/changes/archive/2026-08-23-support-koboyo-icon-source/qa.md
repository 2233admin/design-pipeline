# QA

## Foundations

- `DESIGN.md`: ready; SHA-256 `1126499915fb720ce0943afcba8b9327885c11a6ccc63160db96cd801a8cf88e`.
- `MOTION.md`: ready; SHA-256 `5a23e0fcdb7d4ebddea2f8f446b91edbdaba3812baf44a7066034b5b2d8e7302`.
- Visual direction preview: waived, `non-visual`.

## Verification

- Focused resolver and CLI tests: 14 passed, 0 failed.
- Stage 0/Stage 5: stack, component, and design-system decisions are `ready`; component routing has
  no unavailable capability.
- Full repository QA: 372 passed across 42 test files, 0 failed.
- Packaging: reproducible TGZ, ZIP, and checksum artifacts.
- Installation: isolated fresh install, explicit replacement, installed dependency self-check, and
  public CLI smoke (9 passed, 0 failed).
- Repository status was byte-identical before and after the hermetic QA run.

## External Authority

- No Koboyo API key, MCP runtime, canvas mutation, or icon corpus was used.
- Feedback observation `dpf-4c0325ae1074b2f1` remains a local draft.
- The globally installed `design-pipeline` copy remains older than the repository source; it was not
  replaced. The packaged copy was verified in isolation.
