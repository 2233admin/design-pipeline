# Interaction output protection QA

The pre-fix public CLI regressions failed for page/state aliases and escaping default/report destinations. Independent real Chrome execution also showed the report overwriting the measured HTML and binding its replacement JSON as checked, and a default evidence junction producing a report outside the requested root.

The first repair passed seven pre-capture protection cases: probe same-file/hard-link, page same-file/hard-link, state hard-link, default directory junction and existing report-file symlink escape. Every input and existing external file retained its exact bytes. Invalid browser dependencies distinguish a preflight rejection from a capture failure.

Independent review then found that `existsSync` treated a dangling report link or junction as an ordinary missing path. Both public counterexamples reached the capture kernel rather than failing containment. The shared path helper must reject unresolved links before walking to their parent; ordinary new paths and resolved contained links retain their behavior.

Evidence is retained under ignored `.design-pipeline/correctness-x9T5c5/`:

- `workflow-proof/observations.json`, `boundary-observations.json`, `default-output-observations.json`: original real-command counterexamples and ordinary workflow controls.
- `test-proof/interaction-protection-red.txt` and `interaction-protection-green.txt`: initial red/green protection cases.
- `workflow-proof/reverify/run-5SiwCZ/proof.json`: nine independent alias/escape rejections and four real Chrome controls after the first repair.
- `workflow-proof/reverify/dangling-Rj9bBl/proof.json` and `native-proof/dangling-leaf-1791392887523/RESULT.json`: unresolved-link preflight counterexamples. These use invalid tools and do not claim an external write occurred.
- `test-proof/dangling-red.txt` and `dangling-green.txt`: two further observed failures followed by nine passing protection subcases on the final shared-helper repair. No skipped cases; nonexistent external targets remain nonexistent.
- `final-focused-tests.log`: workflow-next, designer-pipeline-cli and interaction-cli checks passed 79/79, with zero failures or skips, on the final runtime.
- `native-proof/dangling-leaf-1791393056483/RESULT.json` and `resolver-semantics-1791393093174/RESULT.json`: independent final rejection and compatibility controls for ordinary missing paths, resolved contained links and dangling directory descendants.
- `workflow-proof/reverify/dangling-e5TZmx/proof.json` and `final-0ZNMBN/proof.json`: final independent dangling leaf/directory rejection, 11 shared-helper controls, a middle-parent CLI rejection and a real Chrome default-output pass bound to actual page bytes.

The real browser controls declare `responds:false` for a static button. They prove capture, evaluation and page binding; they do not establish animation quality, component conformance or owner Visual Acceptance. Final independent review and repository integration results belong in verification.md.
