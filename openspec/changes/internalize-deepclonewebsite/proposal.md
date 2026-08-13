# Proposal: Internalize DeepCloneWebsite

## Problem

The website-cloning module had strong page-level fidelity contracts but no bundled source reference
for authenticated whole-site discovery, template grouping, offline multipage capture, or optional
product/data/backend/design analysis.

## Decision

Bundle the complete MIT-licensed `hi5jeff/deepclonewebsite` cloning feature slice at one reviewed
revision and adapt it through the existing Browser/Builder/Evidence protocol. Keep the snapshot
passive: no Open Lovable runtime, model default, or dependency becomes part of design-pipeline.

## Success Criteria

- A fresh package contains the 29 reviewed feature-slice files, license, provenance, and integrity
  metadata.
- Whole-site work distinguishes direct, structure, and explicit full capture modes.
- Authentication, deterministic discovery, representative selection, offline assets, internal
  routes, and optional inferred documents have evidence and safety boundaries.
- Upstream swallowed errors, blind retries, origin assumptions, and unsupported backend claims are
  explicitly rejected.
