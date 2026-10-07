# Web Evidence Adapter Protocol

Adapters are trusted local executables selected by explicit path. The core never resolves ambient
packages and never installs or downloads a browser.

The host starts the adapter in a child process with a bounded environment and JSON request on stdin:

```json
{"schema":"design-pipeline.web-evidence-request.v1","url":"https://example.com","viewport":{"width":1280,"height":720},"outputRoot":"..."}
```

The adapter writes one `design-pipeline.evidence-receipt.v1` JSON object to stdout. All artifact
paths must stay under `outputRoot`; missing measurements remain `blocked` or `unknown`.

## Bundled adapters

Tools reach an adapter only through explicit host options, forwarded as environment variables.
Project-installed tools must resolve inside `--project-root`.

| Adapter | Host options | Fills |
| --- | --- | --- |
| `adapters/agent-browser.cjs` | `--agent-browser <path>` (the agent-browser executable or the npm package's `bin/agent-browser.js`, project-installed); `--agent-browser-state <file>` (optional saved cookies and localStorage, see below); `--chrome <exe>` (needed when agent-browser cannot find a browser inside the bounded adapter environment, as measured on Linux) | all seven: full-page screenshot, gzipped Chrome trace, DOM, console plus uncaught page errors, network requests without headers, axe-core accessibility, Web Vitals |
| `adapters/playwright.cjs` | `--playwright-module <path>` (project-installed) | screenshot, Playwright trace, DOM, console; accessibility, network and performance stay `unknown` |

### Starting from saved state

Some surfaces only appear after saved state is restored: a saved layout, a chosen account or a
switched-on data source kept in cookies or localStorage. Save that state once with agent-browser,
then pass it to the capture:

```bash
agent-browser state save .design-pipeline/state/<name>.json   # in a session already showing the surface
designer-pipeline evidence capture ... --agent-browser <path> --agent-browser-state .design-pipeline/state/<name>.json
```

- **Location:** the file must stay inside `--project-root`. It needs `--agent-browser`, because
  only that adapter can load it.
- **Receipt:** the probe message names the file and its sha256. The contents are not copied
  into the evidence.
- **Credentials:** state files can hold session cookies, so keep them in ignored paths such as
  `.design-pipeline/`.

```bash
npm install --save-dev agent-browser
designer-pipeline evidence capture --project-root . --adapter-path <skill>/adapters/agent-browser.cjs \
  --agent-browser node_modules/agent-browser/bin/agent-browser.js --chrome <chrome-executable> \
  --output-root .design-pipeline/evidence/<id> --url http://localhost:5173/ --width 1440 --height 900 --timeout-ms 120000
```
