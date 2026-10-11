# Web Evidence Adapter Protocol

Adapters are trusted local executables selected by explicit path. The core never resolves ambient
packages and never installs or downloads a browser.

The host starts the adapter in a child process with a bounded environment and JSON request on stdin:

```json
{"schema":"design-pipeline.web-evidence-request.v1","url":"https://example.com","viewport":{"width":1280,"height":720},"outputRoot":"..."}
```

The adapter writes one `design-pipeline.evidence-receipt.v1` JSON object to stdout. All artifact
paths must stay under `outputRoot` and contain no file or parent-directory links, so they
remain valid after publication; missing measurements remain `blocked` or `unknown`.

The host validates target identity, containment and artifact hashes, then exclusively writes
`receipt.json` before publishing the staged directory. This filename is host-owned metadata,
not an artifact or an entry in `hashes`; adapters must not create a file or link at that path.
A collision fails capture and removes the stage instead of overwriting adapter output.
The public CLI returns the bare v1 receipt at `result.receipt` (JSON output: `receipt`), not
`receipt.receipt`. Complete and partial receipts keep their measured status.

```bash
designer-pipeline evidence check --receipt .design-pipeline/evidence/<id>/receipt.json \
  --evidence-root .design-pipeline/evidence/<id> --require-files --json
```

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

- **Location:** the file must stay inside `--project-root`. It needs `--adapter-path
  <skill>/adapters/agent-browser.cjs` and `--agent-browser`, because only that adapter loads it;
  with any other adapter the capture fails before it starts.
- **Receipt:** the host reads the file once into a private copy in the system temp directory, the
  browser loads that copy, and the copy is removed afterwards. The probe message names the file
  and the sha256 of those bytes, so a later edit to the file cannot change what the receipt
  claims. The contents are not copied into the evidence.
- **Credentials:** state files can hold session cookies, so keep them in ignored paths such as
  `.design-pipeline/`.

```bash
npm install --save-dev agent-browser
designer-pipeline evidence capture --project-root . --adapter-path <skill>/adapters/agent-browser.cjs \
  --agent-browser node_modules/agent-browser/bin/agent-browser.js --chrome <chrome-executable> \
  --output-root .design-pipeline/evidence/<id> --url http://localhost:5173/ --width 1440 --height 900 --timeout-ms 120000
```
