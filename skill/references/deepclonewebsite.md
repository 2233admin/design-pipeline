# Built-in Deep Site Cloning Reference

`design-pipeline` ships the reviewed website-cloning feature slice from
[`hi5jeff/deepclonewebsite`](https://github.com/hi5jeff/deepclonewebsite) as passive source
evidence. The pinned revision, MIT license, import scope, normalized file count, and canonical
tree hash live in `references/deepclonewebsite/manifest.json`; the 29 reviewed files are under
`references/deepclonewebsite/upstream/`.

This is not a second cloning runtime. Do not execute the vendored Next.js routes, install its
Open Lovable dependencies, select its hosted model defaults, or copy the application wholesale.
Use the source to inform the existing Browser/Builder/Evidence port workflow in
`references/website-cloning.md`. The target project's stack and design-pipeline contracts remain
authoritative.

## Adopted Model

| Upstream capability | Pipeline use |
| --- | --- |
| Visible browser login gate | When authentication is in scope, BrowserPort opens a user-visible browser, the user completes login, and capture starts from the final authorized URL. No credential is written to design artifacts. |
| Persistent profile plus exported storage state | Reuse an ignored, target-scoped browser profile only for the authorized host. Treat it as credential material and never package it. |
| Same-domain crawl | Discover only explicitly allowed HTTP(S) hosts, honor redirects and exclusions, and impose finite depth/page limits. |
| URL-pattern plus DOM-fingerprint grouping | Separate page templates from repeated data records before implementation. Keep representative URLs and ambiguity samples as evidence. |
| `structure` and `full` depth | Prefer `structure` for template reconstruction. Use `full` only when the user explicitly needs every authorized page and a finite cap is recorded. |
| Deterministic capture and rebuild | Capture rendered structure, text, assets, states, and link topology without asking an LLM to redraw the site from prose. BuilderPort still implements inside the target stack. |
| Product/data/backend/design analysis | Produce optional, evidence-linked hypotheses after capture. These documents are reverse-engineered proposals, not facts about an unseen backend. |
| Task status and progress | Persist resumable phase, artifacts, blockers, and evidence in the existing change `state.json`, `events.jsonl`, and `handoff.md`. |

## Capture Modes

### Direct

Use the declared `--url` targets only. This remains the default for a page or small fixed set of
pages and needs no site crawl.

### Structure

Use when the user wants the site's templates or information architecture rather than every data
record.

1. Start from the final authorized URL after any login gate.
2. Breadth-first discover only allowed same-domain pages under explicit page/depth limits.
3. Normalize fragments, trailing slashes, and query policy without silently treating different
   security origins as equivalent.
4. Group candidates by URL pattern and rendered DOM fingerprint. Keep at least one representative
   per stable template and additional samples when the grouping is ambiguous.
5. Let an optional planning model merge or label deterministic groups only after the raw site map
   exists. It cannot invent captured pages, assets, states, or measurements.

### Full

Use only for an explicit whole-site requirement. Record the allowed hosts, exclusions, maximum
pages, maximum depth, asset-size policy, and stop conditions before navigation. Full mode does not
waive copyright, target terms, rate limits, destructive-action boundaries, or fidelity evidence.

## Execution Contract

1. **Authorize and scope.** Confirm ownership or permission, pages, hosts, authentication, capture
   mode, outputs, and finite limits.
2. **Open and capture session.** Use BrowserPort. Authentication is a user-visible interaction;
   profile and storage state stay ignored and outside packaged artifacts.
3. **Discover deterministically.** Write `site-map.json` with normalized/final URLs, status,
   depth, page type, DOM fingerprint, sample URLs, warnings, and provenance.
4. **Plan representatives.** Write `capture-plan.json` with selected templates, merged groups,
   exclusions, reasons, and links back to site-map evidence.
5. **Build from evidence.** Localize only authorized assets, record checksums and permission notes,
   preserve internal route topology, and implement interactions through BuilderPort. A scriptless
   DOM snapshot is evidence, not an interactive implementation.
6. **Analyze optionally.** Distill deterministic UI outlines and tokens first. Product structure,
   data model, backend API, and design-system documents must cite observed pages/controls/fields,
   label inference and confidence, and list unknowns.
7. **Verify independently.** EvidencePort compares every declared viewport, representative page,
   mapped interaction, route, and analysis claim required by the change. Run the normal
   design-pipeline gates afterward.

## Deliberate Repairs To The Upstream Pattern

The source snapshot is evidence, not policy. Local implementation must repair these boundaries:

- Do not swallow navigation, download, browser-close, parsing, or write failures. Record the exact
  failed URL/artifact and decide whether the target is blocked or fidelity-limited.
- Do not use blind retries. Retry only a classified transient operation with a finite budget and
  preserve the final error.
- Do not infer that `www.example.com` and `example.com` share an authorization boundary. Use the
  declared host allowlist and observed redirects.
- Do not strip scripts and then claim interaction fidelity. Rebuild observed behavior or declare
  the output static and measure only that contract.
- Do not let asset download failures silently create a successful build. Missing authorized assets
  remain evidence-linked mismatches.
- Do not present generated product, database, or API documents as recovered backend truth. They are
  hypotheses derived from visible UI evidence.
- Keep credentials, browser profiles, generated sites, and large captures out of the package and
  repository history unless the user explicitly authorizes a safe artifact.

## Pipeline Mapping

- **Stage 0:** choose direct/structure/full, authorization, allowed hosts, login requirement,
  limits, outputs, and Browser/Builder/Evidence adapters.
- **Stage 1/2:** capture the site map, representative samples, behavior evidence, assets, palette,
  and optional analysis inputs.
- **Stage 3:** bind selected page types and inferred outputs into `design.md` and component
  contracts. Keep source evidence and inference separate.
- **Stage 4/5:** build the minimum authorized page/template set in the existing project stack.
- **Stage 6:** verify every representative, viewport, route, interaction, asset, and requested
  analysis output; classify gaps instead of hiding them.

## Maintaining The Snapshot

Update one reviewed upstream revision atomically: `LICENSE`, Chinese README, package manifest,
i18n file, every `lib/crawl` file, every `app/api/crawl` route, and `app/site-clone/page.tsx`.
Normalize line endings to LF, then update revision, Git tree, normalized byte count, canonical tree
hash, third-party notice, package resources, and integrity test together.
