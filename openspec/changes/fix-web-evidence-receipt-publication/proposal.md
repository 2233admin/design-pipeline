## Why

Web capture validates a v1 receipt but publishes only its artifacts. The public CLI additionally nests the capture-host CLI result under `receipt`, so its receipt is rejected by the existing strict v1 checker. Historical issue #69 describes both failures.

## What Changes

- Publish the validated bare receipt as host-owned `receipt.json` in the staged evidence directory before its atomic rename.
- Return that bare receipt under the public CLI's single existing result envelope; preserve capture status and incomplete evidence.
- Reject adapter collisions with the host-owned filename without overwriting artifacts or publishing a successful directory.
- Extend existing behavioral tests and adapter documentation; no dependency, schema or generic kernel change.

## Capabilities

### Modified Capabilities

- `design-pipeline`: existing runtime evidence capture and portable receipt validation.

## Impact

Source: `capture-web-evidence.cjs`, capture-only `evidenceCommand` in `cli-core.cjs`. Existing adapter and public CLI tests, adapter protocol and changelog are affected. Bundled adapters emit receipts on stdout and do not write `receipt.json`. Custom adapters must leave this filename to the host. Other kernel envelopes are unchanged.

## Authorization and risk

Ordinary maintenance is covered by the operator's standing autonomous-repair authorization. Multica is temporarily unavailable; retain branch/PR and execution evidence for reconciliation. Preserve the dirty shared checkout. Do not dispatch release workflows or push tags. The compatibility correction removes the erroneous extra CLI envelope; callers reading `receipt.receipt` must use `receipt`.
