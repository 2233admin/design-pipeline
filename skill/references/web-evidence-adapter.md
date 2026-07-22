# Web Evidence Adapter Protocol

Adapters are trusted local executables selected by explicit path. The core never resolves ambient
packages and never installs or downloads a browser.

The host starts the adapter in a child process with a bounded environment and JSON request on stdin:

```json
{"schema":"design-pipeline.web-evidence-request.v1","url":"https://example.com","viewport":{"width":1280,"height":720},"outputRoot":"..."}
```

The adapter writes one `design-pipeline.evidence-receipt.v1` JSON object to stdout. All artifact
paths must stay under `outputRoot`; missing measurements remain `blocked` or `unknown`.
