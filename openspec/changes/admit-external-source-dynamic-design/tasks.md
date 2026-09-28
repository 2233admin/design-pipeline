# Governed source and Dynamic Design tasks

- [x] Define the governed promotion decision and source identity rules: every VCS-backed admitted source SHALL bind its VCS revision/commit as part of source identity; non-VCS sources SHALL use their applicable revision/content identity without requiring Git.
- [x] Implement promotion from AD-2 `reference-only` to an isolated executable snapshot only after provenance, license/status, deploy profile, and sandbox allowlist checks pass.
- [x] Enforce declared/allowlisted sandboxed deploy profiles and reject arbitrary repository commands, lifecycle hooks, package scripts, and unapproved lifecycle expansion.
- [x] Preserve existing blocked, review, invalid, and unverified outcomes through promotion and deploy/runtime handoff; do not add a parallel gate.
- [x] Implement the Dynamic Design boundary for governed live endpoints and built static artifacts, with structured motion/interaction composition and evidence references as outputs.
- [x] Ensure Dynamic Design cannot clone, build, start, capture, probe, package, or publish on behalf of another domain.
- [x] Thread source revision/content identity, artifact hashes, execution-target identity, route, toolchain, and receipt lineage through Capture, Probe/Gate, and Package/Publish.
- [x] Enforce the final publish gate so an incomplete or mismatched lineage cannot produce a final artifact.
- [x] Add hermetic fixtures for reference-only default admission, governed promotion, sandbox allowlisting, arbitrary-command rejection, Dynamic Design ownership, lineage continuity, and final publish gating. Independent core tests cover reference-only inert, governed promotion, allowlist rejection, lineage continuity, publish gating, source/target exclusion, and workspace lifecycle; all are registered in the repository test manifest.
- [x] Add or update reference-governance coverage proving motion-web remains a CC BY-NC reference/parity fixture with no copied code, assets, cases, or runtime dependency.
- [x] Implement Deploy/Runtime companion workspace ownership for each promoted source, enforcing source-tree and target-tree exclusion, execution-target/deploy-profile binding, isolation, containment, and rejection of source writeback or target-tree mutation.
- [x] Define and implement explicit companion-workspace lifecycle, cleanup, retention, disposal, and recovery policy without introducing a parallel gate.
- [ ] Run strict OpenSpec validation and the declared repository QA command; record actual outcomes in the change evidence.
