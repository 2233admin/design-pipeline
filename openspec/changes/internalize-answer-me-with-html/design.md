## Context and decision

The user accepted a bounded internalization after a source-backed assessment and actual upstream render study. The existing Good CSS import/source-manifest/helper pattern is the seam. Upstream is an ESM renderer with a generated CLI; local maintained helpers remain CommonJS. A generated ESM library exposes only rendering and policy-inspection primitives, so consumer projects require Node 22+ but no npm install, original skill or home configuration.

## Interface

`node <skill>/tools/answer-me-with-html/build-explanation.cjs --input <draft.md> --output <new-directory> [--asset-root <directory>] [--template doc|sheet] [--theme paper|blueprint|shadcn] [--mode auto|light|dark]`

The library-facing `buildExplanation(options)` is asynchronous and uses the same contract. Defaults: doc, paper, auto; controlled-writing lint off (not a verified ASD-STE100 conformance claim). Explicit flags override frontmatter; absent template/theme flags still use these local reading defaults. `asset-root` defaults to the input's real parent directory. Input may be outside it, but included raster images/code must resolve inside it, including through symlinks. Pasted code remains ordinary code. Raster image formats supported by the upstream renderer exclude SVG; generated diagram SVG remains supported. HTTP(S)/mailto/fragment hyperlinks may be followed by the reader; resource URLs, arbitrary data URI active content and raw HTML/SVG are not accepted.

Output is a new directory containing `index.html` and complete `LICENSES.txt`. The parent must exist. Existing files/directories/link aliases are refused. Read, inspect and render before publishing a staged directory; failures do not leave caller-visible successful output. Output cannot overlap preserved source or packaged helper code. A result reports paths, actual template/theme, panel/component statistics, `sourceEmbedded: true`, manual feedback and creative acceptance not assessed. It is not a new receipt.

## Implementation and trust

The preserved source snapshot is byte-exact and distinct from maintained glue. A maintenance build entry bundles upstream `renderDoc`, `parseDoc`, `parseCodeArgs` and Marked's lexer using the reviewed lockfile/esbuild/assets and Temml loading strategy. The generated library has no CLI main or updater/config entry. Build inputs and output hash are recorded in source provenance; dependencies and math/font notices describe the actual generated artifact. Do not edit generated bundled bytes.

Preflight uses the same upstream section/fence parser and bundled Marked lexer, not a second Markdown grammar. Traverse token structures/references and component label content as applicable. Reject raw HTML/SVG fences/prose, unsafe schemes and remote resource URLs. Resolve each file include to a real regular file inside the authorized asset root before rendering; reject SVG images and secret-bearing code files consistently with upstream rules. Require offline resource behavior; inject a restrictive CSP using hashes of the renderer's trusted inline runtime, data-only image/font sources and no connections/forms/frames/base URL. No home/config/network/process opening or deployment is part of the helper. Only reviewed local rendering source is executed.

The original draft is deliberately embedded and copyable; this is a communication artifact, not a redacted public report. The guide must warn that sharing it shares the draft, included files/images and path provenance. No promise that the visible text is the only disclosed data. Browser feedback is ordinary copy-back text: comments remain quoted reader input, untouched recommendations remain unanswered, and no pipeline acceptance/state/receipt is mutated.

## File ownership

- Source owner: `scripts/import-answer-me-with-html.cjs`, `scripts/build-answer-me-with-html-runtime.cjs`, vendor source/manifest/dependency licenses, generated `skill/tools/answer-me-with-html/renderer.mjs`, source integrity tests, and source maintenance scripts in `package.json`.
- Helper owner: `skill/tools/answer-me-with-html/build-explanation.cjs`, adversarial/consumer-visible helper tests.
- Integration owner: tool README/example, `skill/tools/README.md`, skill entry pointer if needed, existing capability/resource indexes, vendor guide/notices, test manifest and changelog.
- Main: this OpenSpec change, cross-slice evidence and final acceptance. No owner may rewrite another owner's file or unrelated staged changes.

## Compatibility and verification

No existing callsites migrate; this is a task-triggered supporting helper, not an alias or replacement command. Existing complete deliverables keep their workflow/verification/owner decisions. Generic explanation feedback cannot be inserted into runtime-review because its Bundle/object/identity tuple is absent.

Verify isolated packaged invocation from a different working directory without companion/npm dependencies; actual offline browser render, CJK, long labels and default narrow viewport; comments/ask/copy-back and untouched choices; active-content, remote-resource, outside-root and symlink rejection; included raster/code behavior; source disclosure; non-overwrite and missing-resource failures; source/license hash closure; existing QA and strict OpenSpec validation. Technical success never grants Component Conformance for a user's project or Visual Acceptance.

## Executed integration evidence

- The reviewed renderer rebuild passed `--check` with a direct byte comparison, after using a valid `biome-ignore-all lint format assist` generated-file suppression. The reviewed runtime SHA256 is `12d1dbce667574d3e068c08ca66dd6d84ea39ffd2eb7935014d18ac813a06e4b`. Source validation independently pins this digest; changing both runtime and manifest is rejected.
- `node --test tests/answer-me-with-html-sources.test.cjs tests/answer-me-with-html.test.cjs`: 67 passed, zero failed/skipped. Cases include local-root/symlink boundaries, active and remote content, secrets, existing output, missing resources, immutable trees/notices/font policy and rehashed runtime substitution.
- Actual helper calls rendered the standalone Chinese example and a five-panel explanation with a long-label flow, code/image includes, MathML, literal hostile code and an ask prompt. The integrated image loaded at natural width 1680; one MathML element rendered; the hostile-code probe remained undefined; resource performance entries were empty.
- In Chrome, a multiline comment containing a literal script example returned verbatim as quoted reader input. The untouched recommendation remained `未作答，保留建议`; choosing the other option changed the reply explicitly. With clipboard writing rejected and fallback copying disabled, the complete reply textarea was focused and selected.
- Real desktop and narrow screenshots were captured. Theme/mode selection and the diagram's `改后` control worked. The extracted package's default doc/paper/auto example measured viewport width 390 and document scrollWidth 375; this is representative content proof, not a universal layout guarantee.
- `scripts/package.cjs` produced TGZ, ZIP and checksums. The TGZ was extracted into an isolated ignored directory; its helper rendered its own example from `C:\Windows\Temp` without npm installation or companion dependencies. The package contained the renderer and required redistribution notices.
- Full `npm test` was executed: the repository test phase reported 1553 tests, 1542 passed, seven failed and four skipped; reproducible archives and the installed-package CLI smoke passed. The new source's missing canonical-catalog record was fixed and its completeness checks subsequently passed. Other failures included Windows temporary-directory rename `EPERM`, its dependent `ENOENT`, and two website-cloning initialization assertions whose cause was not established; full QA is not claimed green.
- After completing the canonical source and inherited-notice metadata, the source-completeness plus explanation suites passed 72/72; `npm run sources:check` passed 87/87; `npm run specs:check` passed 33/33. A final TGZ/ZIP build and extracted helper invocation also passed. These focused results do not replace or reclassify the full-suite failures.
- These checks establish technical behavior only. They do not record a user's Component Conformance or Visual Acceptance; feedback remains manual and source sharing remains explicit.
