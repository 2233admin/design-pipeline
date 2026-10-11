## 1. Contract and regression

- [x] 1.1 Trace pinned-main capture, public envelope and strict v1 checker; record existing issue #69 and standing maintenance authorization.
- [x] 1.2 Extend existing public capture tests for direct checker roundtrip and honest partial receipts; observe failure before implementation.

## 2. Repair

- [x] 2.1 Persist validated receipt exclusively in the stage before rename; unwrap only the capture result and migrate the nested-shape consumer.
- [x] 2.2 Document host metadata ownership and add the changelog correction; verify collision cleanup and saved-state privacy.

## 3. Verification and delivery

- [x] 3.1 Run focused receipt regressions, `npm run specs:check`, and the complete `npm test` gate in the dedicated checkout.
- [ ] 3.2 Exercise the real public CLI/checker smoke and independently accept the exact candidate SHA; record remaining gate failures accurately.
- [ ] 3.3 Publish a safe maintenance branch/PR without tags; merge only after current exact-SHA gates pass and independently verify canonical merged state.
