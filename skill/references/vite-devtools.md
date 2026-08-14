# Vite DevTools adapter

Use this route only when a frontend brief explicitly requests Vite DevTools. Vite+ and Vite
DevTools are related ecosystem tools, but they are not the same package: Vite+ supplies the `vp`
toolchain, while Vite DevTools supplies the composable inspection dock.

## Contract

- Probe the target project's local `@vitejs/devtools`, `vite`, and optional `vite-plus` packages.
- Do not install packages, run migration, or edit `vite.config.*` during probing.
- Require the target project to choose and configure standalone or embedded mode explicitly.
- Start the project through its declared runtime (`vp dev` or its package script); the adapter does
  not guess a package-manager command.
- Record only integrations that are actually mounted. Preserve Playwright screenshot, console, DOM,
  and trace evidence as the fallback when DevTools is missing or incomplete.
- Because Vite DevTools is early preview, an unavailable probe blocks the requested adapter but does
  not imply that the underlying Vite application is invalid.

## Evidence

A completed invocation receipt should identify the detected DevTools version, the project command,
mounted integrations, and linked browser evidence receipts. Plugin graphs, build analysis, test UI,
or Oxc results may be claimed only when their corresponding integrations are present.

## Managed CLI

Run the packaged adapter from the installed skill root:

```text
node scripts/vite-devtools-adapter.cjs probe --project-root <project>
node scripts/vite-devtools-adapter.cjs start --project-root <project> --output-root <evidence-dir>
node scripts/vite-devtools-adapter.cjs stop --project-root <project> --output-root <evidence-dir>
node scripts/vite-devtools-adapter.cjs build --project-root <project> --output-root <evidence-dir>
```

`start` resolves the project-local published binary directly, binds only to a loopback host, disables
automatic browser opening, waits for `/__devtools/`, and records its PID, URL, version, logs, and
hash-bound state. `stop` consumes that state. `build` invokes the official static-build command and
writes it below the declared evidence directory. All output and config paths must remain inside the
target project.
