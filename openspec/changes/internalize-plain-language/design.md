# Design: Directness With a Fidelity Guard

The main skill carries only routing and gate language. `references/plain-language.md` owns the
detailed writing contract, and `qa-checklist.md` owns the review record.

The first pass reorders copy around the reader's consequence or next action. The second pass checks
an internal fact ledger: actor, event, exact scope/count, uncertainty, time/limit, unchanged state,
and available action. Directness loses whenever it changes any of those facts.

No semantic scoring CLI is added. Whether a first sentence is useful is contextual; deterministic
checks would reward short copy while missing the exact scope regression this change exists to
prevent.
