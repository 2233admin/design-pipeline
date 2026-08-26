# Proposal: internalize DesignMD source examples and iart motion skills

## Why

MengTo is already a complete offline library. Two remaining design sources were only
partially or not at all in the pipeline:

- `dimabraven/design-md` is the MIT example set behind DesignMD Directory. The pipeline already
  crawls `designmd.directory` at runtime, but the GitHub examples are not pinned, so offline
  synthesis cannot cite them.
- `iart-ai/motion-skills` is a 15-pack MIT motion-graphics library. The pipeline has UI motion
  contracts and a HyperFrames video route, but none of these playbooks.

## What

- Pin `dimabraven/design-md` as a byte-preserved, MIT-attributed snapshot. Offline
  `designmd search|inspect|verify` uses it when no directory catalog is supplied. Directory sync
  stays a live ingest. Bundled examples never become a product `DESIGN.md`.
- Pin every iart-ai pack that ships a LICENSE, plus the index repository. Local `iart search|verify`
  returns candidates. Web-motion and WebGL playbooks may be selected automatically; video, Remotion,
  After Effects, freelance-ops, and credentialed workflows stay explicit-only.
- Exclude `generative-illustration-skills` until it has a LICENSE in the reviewed revision.
- Route motion-graphics briefs to the new catalog; keep HyperFrames as the HTML-video runtime.

## Boundary

Bundled files are inert. Search does not execute scripts, install Remotion/Manim/GSAP, wrap
`designmd-cli install`, or authorize paid, credentialed, or publication actions.
