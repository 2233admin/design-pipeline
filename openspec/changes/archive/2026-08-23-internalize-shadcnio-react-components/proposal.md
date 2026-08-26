# Proposal: internalize the shadcnio React component index

## Why

The pipeline needs an offline, attributable way to discover common shadcn-style React behavior
without treating a website link as permission to copy or install its implementation.

## What

- Pin and preserve the complete reviewed `shadcnio/react-shadcn-components` repository.
- Parse its README into a deterministic local search index of AI, button, hook, and text entries.
- Mark results as review-only reference adaptations because the linked page code is not in the
  source repository.
- Add provenance, integrity checking, package inclusion, capability routing, and tests.

## Boundary

This integration bundles the upstream LICENSE and README only because those are the complete
reviewed source tree. It does not package linked webpage implementations, install dependencies,
execute generators, or grant implementation-copy authority.
