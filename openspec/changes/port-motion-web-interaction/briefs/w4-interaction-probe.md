# w4: verify interaction (measured interaction probe)

Read `_common.md` first. The contract is `design.md`, section "Probe contract". Implement it as
written.

## Build

1. `skill/scripts/interaction-core.cjs`: validate `interaction.json` (use `contract-utils.cjs`
   helpers such as `assertKeys`, `assertEnum`, `fail`, like `film-core.cjs` does), and a pure
   `evaluateSamples(probe, samples, requests)` that turns recorded samples into findings and
   metrics. Keep all measurement math in this pure function so it is unit-testable without a
   browser.
2. `skill/scripts/interaction-capture-core.cjs`: the browser part. Reuse the puppeteer-core and
   Chrome discovery from `skill/scripts/film-capture-core.cjs` (export and import its resolvers;
   do not duplicate them). Load the page (file path relative to the probe file, or http URL), install
   a `requestAnimationFrame` recorder for the target, drive the input with `page.mouse` /
   `page.mouse.wheel` at 60 steps per second, collect samples and every request URL.
3. `skill/scripts/capture-interaction.cjs`: child-process kernel like
   `skill/scripts/capture-film-timeline.cjs`.
4. CLI in `skill/scripts/cli-core.cjs`: `verify interaction --probe <file> [--output <dir>]
   [--chrome <exe>] [--puppeteer-module <path>]`. Register every new flag in `KNOWN_OPTIONS`.
   Add the command to the help text next to the other `verify` lines. Write the result JSON to
   `--output` (default `evidence/interaction.json` next to the probe) and print it. Exit codes:
   0 passed, 2 gate failed, 1 contract or usage error. Record the gate with
   `workflow.recordGate(projectDir, "interaction", status)` where `projectDir` is the probe file's
   directory.
5. Add the new scripts to `skill/references/package-resources.json` `required`.

## Measurement rules

Use the thresholds in `design.md`. For `linear-response`: compute per-frame speed along the main
axis of motion; call it spring-like if the value overshoots the final value by more than 2% of the
travel or the speed rises and then falls (peak not at either end). Anything else with
`response: "spring"` is a `linear-response` warning.

## Tests

- Unit tests on `evaluateSamples` with synthetic sample arrays for every finding and a clean pass.
- One browser test that serves a tiny local HTML fixture (spring-following card) and one dead
  fixture; skip with a clear message when puppeteer-core or Chrome is not found (same detection as
  the film capture tests; look at how they skip).
- CLI test: bad probe file gives exit 1 with a contract message.

## Files

The three new scripts, `cli-core.cjs` (verify interaction only), `film-capture-core.cjs` (exports
only), `package-resources.json`, tests, test manifest, CHANGELOG.

Branch: `motion-web-w4-interaction-probe`.
