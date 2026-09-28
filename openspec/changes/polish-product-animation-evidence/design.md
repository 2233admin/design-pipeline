# Product-animation polish evidence design

## Decision

Keep the 20-second canonical authored graph as the single source of motion. The polish adds no second runtime, global graph API, gate system, or receipt authority. Target-local verification consumes the existing graph and target evidence seam; the 7.5-second MP4 is a deterministic derivative rendered from the same `index.html` composition, not a rebranded historical artifact.

## Evidence model

| Concern | Authoritative technical evidence | Explicitly not proven |
| --- | --- | --- |
| Component Conformance | Target verifier checks public surface, graph contract, beat/settle behavior, controls-safe captures, deterministic sample and receipt lineage. | That a person accepts the visual result. |
| Visual Acceptance | A human reviews the current output and explicitly accepts it. | Inferred from checks, hashes, screenshots, or a passing receipt. |

The receipt is target-local. It binds current captures, sample SHA256, decode/frame observations, normal-speed playback observations, viewport/state metadata, and verifier result to the current run. A historical `output/sample-approved/` file or historical `native-*.png` capture MAY remain archived but MUST NOT be cited as a current-run receipt.

## Four-surface controls review

The implementing owner records one reviewable current-run capture and receipt entry for each surface: desktop, mobile, reduced motion, and native controls visible. Each entry records the viewport, runtime state, capture path/hash, and proves that the bottom 210 authored pixels are reserved for native media controls while both terminal human-review strings remain above that region and unobscured when controls are visible. This is a Component Conformance check; the capture is review evidence, not implicit Visual Acceptance.

## Private graph verification seam

The lexical `const motionGraph` remains authored in the page. Production code does not mount it as `window.__motionGraph` or document it as a public API. The target verifier obtains a graph snapshot only through a target-local, test-only hook evaluated in the same page execution context. The hook is not an application integration API and MUST NOT replace or alter the established public `window.film` and `window.__timelines.openalice` contracts.

The verifier retains schema, composition, start, track, and shared-anchor assertions and adds explicit checks that the declared beat sequence is exactly `orient -> extract -> retain -> reference -> inspect -> review`; every boundary maps to declared composition timing without overlap, inversion, or undeclared gap; and every `response.spring-settle` track samples `springProgress` at declared endpoints, settles at its target, and uses bounded spring parameters. The assertion checks authored state and sampled outcome; it adds neither a live clock nor another motion runtime.

## Deterministic derivative and frame proof

`run.cjs --sample` renders a 7.5-second derivative from the target-local canonical composition using a deterministic retime. It neither reads nor copies `output/sample-approved/` as a source. Temporary retime artifacts are cleaned in a `finally` path, leaving only the intended current sample and receipt.

The verifier decodes evidence sequentially and accurately from the produced MP4. It MUST NOT use keyframe-seeking `-ss` approximation as evidence for a beat. It records actual decoded frames covering SOURCE, RETAIN, REFERENCE, Inbox, inspect/review, and ending. The receipt includes MP4 SHA256, ordered decode/frame references, actual wall-clock samples, `playbackRate === 1`, and the native `ended` event result.

## Preservation and non-goals

- `output/sample-approved/` is a preserved archive, not a render input, current receipt, or approval surrogate.
- `baseline/optimization-before-final/` is frozen. This change neither alters it nor treats comparison to it as visual acceptance.
- Existing output can be retained for history; only explicitly generated current target-local evidence may be added for this polish, with distinct lineage.
- This change does not reopen `integrate-product-animation`, change shared pipeline/catalog behavior, or perform the provenance correction owned by `fix-motion-web-provenance`.
