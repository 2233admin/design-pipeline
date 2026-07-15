# Directions: website-cloning module

## Direction A: explicit clone/resume/verify commands

- **Thesis:** Expose three verbs and keep every phase behind them.
- **Fit:** Clear operational interface and strict stage gates.
- **Risk:** Adds command vocabulary the parent skill does not otherwise require.

## Direction B: adapter-oriented orchestration runtime

- **Thesis:** Define browser, builder, and evidence ports with pluggable adapters.
- **Fit:** Maximum long-term provider flexibility.
- **Risk:** Over-engineers a Markdown-and-Node skill package before runtime adapters exist.

## Direction C: URL-first routed module

- **Thesis:** The main skill recognizes website-cloning intent; one initializer creates a resumable run and the reference module governs execution.
- **Fit:** Makes the default request trivial while preserving multi-URL isolation and headless recovery.
- **Risk:** Advanced options remain artifact-driven until repeated demand justifies a larger interface.

## Decision

Select a hybrid of Directions B and C. Keep the URL-first facade for the default caller, but define Browser, Builder, and Evidence ports as the internal superset contract. Record adapter capability negotiation and fidelity thresholds in a machine-readable manifest without shipping speculative provider SDK implementations.
