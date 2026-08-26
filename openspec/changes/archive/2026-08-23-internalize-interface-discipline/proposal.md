# Proposal: Internalize Interface Discipline

## Problem

The pipeline could reference broad design and QA guidance, but its interface-quality review depended
on whichever global skills happened to be installed. That makes an install non-hermetic and loses
the full upstream rules, including changed-UI scope and finding provenance.

## Decision

Bundle the complete MIT-licensed `jakubkrehel/skills` interface suite at one reviewed revision and
make it a native pipeline protocol. The package carries its source metadata, canonical tree hash,
license notice, stage integration, package resource contract, and regression test.

## Success Criteria

- A fresh package contains all eight interface skills and their supporting references without a
  global skill install or network.
- Product-UI work is routed through full/quick interface review and diff findings retain their
  introduced/regression/pre-existing status.
- Tampering, partial vendoring, or source drift fails a deterministic test.
