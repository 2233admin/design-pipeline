# Design

Project foundation: `../../../../DESIGN.md`

Foundation SHA-256: `1126499915fb720ce0943afcba8b9327885c11a6ccc63160db96cd801a8cf88e`

This is a CLI/schema release. The visual foundation remains unchanged. Human-readable Markdown is
paired with versioned JSON sidecars, stable JSON envelopes, and restrained status vocabulary.

## Accessibility and UX

CLI errors identify the field/path and return stable nonzero codes. Missing optional tools report
`blocked` or `unknown`. No successful placeholder implies a capability exists.
