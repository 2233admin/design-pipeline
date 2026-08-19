# Proposal

Make component discovery and routing fail closed when the bundled catalog or capability vocabulary
does not cover the full request. A zero-result must remain explicitly inconclusive, and a partially
routed request must not report `ready` while any requested capability is blocked.

This change addresses feedback observation `dpf-ecdca2bd00fb6035` without adding a one-off weather
or particle keyword. The durable fix protects every component-library search from the same false
exhaustion and partial-readiness failure.
