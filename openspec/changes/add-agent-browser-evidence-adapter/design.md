# Design

## Process boundary

The capture host (`capture-web-evidence.cjs`) keeps its contract: it spawns the selected adapter
with a bounded environment and a timeout, sends `design-pipeline.web-evidence-request.v1` on
stdin and validates the receipt with `requireFiles`. Two host options are added and forwarded as
environment variables, so the adapter never resolves tools from ambient state:

| Host option | Adapter environment | Rule |
| --- | --- | --- |
| `--agent-browser <path>` | `DESIGN_PIPELINE_AGENT_BROWSER` | existing file inside `--project-root` (same trust rule as `--playwright-module`) |
| `--chrome <exe>` | `DESIGN_PIPELINE_CHROME` | existing file; passed to agent-browser as `--executable-path` |

A path ending in `.js`, `.cjs` or `.mjs` runs through the current Node executable (the npm
package's `bin/agent-browser.js` wrapper picks the native binary for the platform); any other
path is executed directly.

## Capture sequence

The adapter runs one isolated session (`--session dp-<pid>-<random>`) and one
`batch --json` call:

1. `open about:blank`, `set viewport <width> <height>`, `trace start`
2. `open <url>`, `wait --load networkidle`
3. `screenshot <stage>/page.png --full`
4. `eval document.documentElement.outerHTML` → `page.html`
5. `console`, `errors` → `console.json`
6. `network requests` → `network.json`
7. `a11y` → `accessibility.json`
8. `vitals` → `performance.json`
9. `trace stop <stage>/trace.json` → gzip to `trace.json.gz`

`close` runs in a separate call afterwards, including when the batch fails, so no browser or
daemon outlives the capture. When the host kills the adapter on timeout, `close` never runs; the
session therefore starts with `--idle-timeout 2m`, which shuts the orphaned daemon and its
browser down instead of agent-browser's default of one hour (verified with a short timeout and no
`close`: no daemon or browser process remained).

A capture of a Vite dev server serving about 170 unbundled modules took 20 s, close to the host's
30 s default; callers on dev servers should pass `--timeout-ms 120000`.

## Artifact shapes

- `console.json`: `[{type, text}]`, the same shape as the Playwright adapter; uncaught page
  errors are appended with `type: "pageerror"`.
- `network.json`: `[{method, url, status, resourceType, mimeType}]`; headers are removed.
- `accessibility.json`: `{axeVersion, counts, violations, incomplete}` from axe-core.
- `performance.json`: the Web Vitals result (`fcp`, `lcp`, `cls`, `inp`, `ttfb`, `phases`).
- The agent-browser `lifecycle` bookkeeping is dropped from every artifact.

A command that fails leaves its artifact `null`. Any failed command, including navigation and
the idle wait, makes the receipt `partial`, because the artifacts may then show the wrong page;
the probe message names the failed commands. The adapter exits non-zero only when agent-browser cannot
be run at all (missing path, unreadable version, unparsable batch output).

## Alternatives

- **Extend `adapters/playwright.cjs` with `@axe-core/playwright` and a request log.** Rejected:
  it hand-assembles what agent-browser ships, adds a second module path to resolve, and still
  lacks Web Vitals.
- **chrome-devtools-mcp CLI.** Strong for performance insights and heap analysis, but its
  accessibility evidence is the Lighthouse subset of axe, it collects usage statistics by
  default, and it keeps a background server between calls. Better suited to interactive
  debugging than to a one-shot evidence port.
