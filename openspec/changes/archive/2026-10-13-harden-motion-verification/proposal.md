# Harden beta motion verification

The beta motion receipt schema rejects valid receipts because it declares only the schema
property while forbidding additional properties. Runtime validation also accepts placeholder
interruption descriptions and zero frame cadence. Lifecycle scenarios cannot be represented.

Repair schema/runtime parity and add opt-in structured lifecycle checks through the existing
motion evaluator. Preserve legacy v1 receipts while making their limited coverage explicit.
This change adds no animation runtime and does not claim to capture browser evidence.
