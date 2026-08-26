---
reviewer: web-reality
reviewed: ARCHITECTURE-SPINE.md
previous_review: reviews/review-web-reality.md
reviewed_at: 2026-08-23
mode: validate-only
---

# BMAD Architecture Web / Reality Check — R2

## Verdict

**PASS WITH IMPLEMENTATION GATES.** The revised spine now matches current public reality for Node/uv, DesignMD’s discovery and resource taxonomy, and the provider boundaries for Figma/Penpot. The prior overclaims are corrected: the Brownfield Delivery Boundary explicitly labels robots, URL/redirect safety, realpath checks, response-byte enforcement, and real importers as incomplete obligations rather than shipped capabilities.

No web-reality contradiction requires changing the spine. The architecture is ready to hand to `bmad-spec`, but the implementation must remain non-ready for live DesignMD sync and `SM-4` until the gates below pass.

The review did not modify `ARCHITECTURE-SPINE.md`.

## Verification performed

- Re-read the revised spine and R1 report.
- Ran the mechanical BMAD spine lint:
  `uv run --no-cache .agents/skills/bmad-architecture/scripts/lint_spine.py --workspace _bmad-output/planning-artifacts/architecture/architecture-design-pipeline-2026-08-23`
  Result: `ok: true`, `total_findings: 0`.
- Local runtime probe: Node `v26.3.1`; uv `0.10.8`.
- Rechecked first-party Node, uv, DesignMD, Figma, and Penpot sources.
- Compared the revised obligations against the current local DesignMD and receipt code without treating incomplete code as a completed capability.

## R1 disposition

| R1 item | R2 result |
| --- | --- |
| Robots enforcement | **Architecture resolved; implementation gate remains.** AD-3, AD-14, and the Brownfield boundary now say this is required but incomplete. |
| Symlink/path containment | **Architecture resolved; implementation gate remains.** AD-5 now requires realpath-aware checks, junction/symlink rejection, and regular-file checks. |
| Figma JSON/tokens ambiguity | **Resolved at architecture level.** AD-6 now requires `source mode`, producer/version, hash, fidelity/loss evidence, and provider-specific input selection. |
| Penpot input ambiguity | **Mostly resolved; archive safety needs story-level detail.** The spine explicitly allows a safe local archive but does not claim the importer exists. |
| DesignMD external-tool completeness | **Resolved.** The Deferred section defines v1 as first-party pages plus governed external references, not recursive provider ingestion. |
| Node “current verification” wording | **Resolved.** The spine now records a dated local validation rather than implying a public release pin. |

## Findings

### R2-001 — HIGH — Security and crawl-policy obligations are correct but not yet executable

**Evidence**

- The revised Brownfield boundary at `ARCHITECTURE-SPINE.md:39-41` explicitly lists robots, response-byte enforcement, URL/redirect safety, and realpath-safe checks as incomplete obligations.
- AD-3 at `ARCHITECTURE-SPINE.md:57-61` now requires all of the relevant controls: robots, budgets, userinfo/query rejection, private-target rejection, same-origin redirect checks, and visible policy failure.
- The current implementation still has no robots parser/policy gate in `skill/scripts/designmd-core.cjs:165-207`; it also has no response-byte limit or redirect revalidation at that layer.
- The current persisted reader still performs lexical `path.resolve`/`path.relative` checks at `skill/scripts/designmd-core.cjs:263-276`, not the realpath-aware guard required by AD-5.

**Reality assessment**

This is no longer a spine defect: the spine accurately says the runtime slice is incomplete. It remains a release-blocking implementation gate because DesignMD’s own policy requires respecting `robots.txt`, avoiding high-frequency scraping, and using its full index/sitemap deliberately: [DesignMD AI Use Policy](https://designmd.directory/ai.txt).

**Recommendation**

Implement one shared source-policy/URL-safety gate before claiming live sync readiness. It must cover robots evaluation, byte budgets, userinfo and sensitive query rejection, private/metadata target rejection, redirect re-checks, and deterministic blocked/partial diagnostics. Add hermetic fixtures for each class and a real DesignMD smoke check. Implement realpath/junction checks for every persisted reader/writer and add a symlink/junction fixture.

**Disposition:** keep the spine unchanged; block implementation readiness until the obligations are tested.

### R2-002 — HIGH — The revised design-tool contract is ahead of the current receipt schema and importer surface

**Evidence**

- AD-6 at `ARCHITECTURE-SPINE.md:75-79` now requires source mode, producer/version, source hash, mappings, editable state, fidelity/loss evidence, root-relative paths, regular-file checks, and byte-hash equality.
- The current `skill/scripts/adapter-core.cjs` receipt validator still validates the older v1 shape: provider, operation, source artifact/hash, mappings, editable, and evidence. It does not validate source mode, producer, fidelity/loss fields, declared roots, regular files, or `sourceLocations` traversal.
- `tests/design-tool-port.test.cjs:7-25` proves a provider-neutral receipt shape for Figma/Penpot/Onlook-class hosts, but it is not a real local Figma/Penpot importer fixture. The spine correctly records `SM-4` as unearned and importer work as future work.

**Reality assessment**

The provider-neutral boundary is sound, but “provider-neutral receipt” must not be confused with importer support. Figma’s official API documents image/SVG/PDF and REST API JSON as distinct export paths: [Figma ExportSettings](https://developers.figma.com/docs/plugins/api/ExportSettings/). The revised spine correctly avoids claiming that JSON/tokens are ordinary local files.

**Recommendation**

In `bmad-spec`, version or extend the receipt schema with the AD-6 fields, define source-mode-specific validation, and add at least one real local fixture per supported mode. Keep receipt-only providers and agent/manual handoffs explicitly non-ready under AD-15.

**Disposition:** no spine change; implementation and schema work is required before `SM-4` or a tool route can become `ready`.

### R2-003 — MEDIUM — Penpot archive safety remains underspecified at the next design level

**Evidence**

- The revised spine defers “Figma/Penpot source-mode manifests and capability probes” at `ARCHITECTURE-SPINE.md:218` and says a safe local archive is a possible input mode.
- Penpot’s official native `.penpot` format is a ZIP container with JSON metadata and binary assets, and the format is versioned: [Penpot file format](https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/).
- Penpot separately supports layer exports such as PNG, JPEG, WEBP, SVG, and PDF: [Penpot exporting layers](https://help.penpot.app/user-guide/export-import/exporting-layers/).

**Impact**

The architecture correctly separates provider-specific formats from the normalized receipt, but the next spec could still diverge on archive handling: path traversal, symlink entries, decompression limits, manifest/version checks, and whether `.penpot` is accepted at all.

**Recommendation**

Freeze one of two explicit v1 contracts: local raster/vector exports only, or `.penpot` archive intake with safe extraction, archive byte/file/ratio limits, entry-path containment, symlink rejection, manifest/version validation, and a whole-input hash. Do not imply that Penpot’s JSON is Figma-compatible.

**Disposition:** defer to `bmad-spec`; not a current spine contradiction.

## Confirmed as reality-consistent

### Node and uv

- The official Node release page lists v22 and v24 as LTS and v26 as Current. A `Node >=22` support floor and a dated local validation are accurate; production guidance should prefer Active or Maintenance LTS releases: [Node.js Releases](https://nodejs.org/en/about/previous-releases).
- Official uv documentation defines `uv run` as the command for running a command or script and documents uv-managed Python environments, matching the BMAD-only Python/uv boundary: [uv CLI reference](https://docs.astral.sh/uv/reference/cli/).
- Local probes match the spine’s dated values: Node `v26.3.1`, uv `0.10.8`.

### DesignMD discovery and resource types

- DesignMD’s public navigation exposes templates, examples/library, skills, guides, tools, and CLI. Its machine-readable guidance names `/llms-full.txt` and `/sitemap.xml`, and its AI policy names `robots.txt` and crawl-rate discipline: [DesignMD homepage](https://designmd.directory/), [DesignMD llms.txt](https://designmd.directory/llms.txt), [DesignMD ai.txt](https://designmd.directory/ai.txt).
- The current five catalog kinds—`skill`, `template`, `example`, `guide`, and `tool`—match the first-party public sections. The revised spine correctly distinguishes first-party entries from external tool references, which is important because the Tools page contains extractors, Figma plugins, AI design studios, skills/prompts, and links to external providers: [DesignMD Tools](https://designmd.directory/tools).
- The existing code seeds `/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, and the site hubs at `skill/scripts/designmd-core.cjs:10-12`; this matches the public discovery names, subject to R2-001 enforcement.

### Figma/Penpot boundary

- Figma’s official documentation confirms real PNG/SVG exports and separately documents JSON through the plugin/API surface; the revised source-mode boundary is therefore the correct abstraction.
- Penpot’s official documentation confirms both versioned local `.penpot` archives and ordinary image/vector layer exports. A provider-neutral receipt plus provider-specific input validation is consistent with that reality.

## Final implementation gates

1. Shared robots/URL/redirect/byte policy with hermetic and live-smoke evidence.
2. Realpath-aware project/evidence containment with symlink/junction and regular-file rejection.
3. Versioned receipt schema matching AD-6, including source mode and fidelity/loss evidence.
4. One real local Figma fixture and one real local Penpot fixture before `SM-4` or a provider route is `ready`.
5. Penpot archive safety and DesignMD first-party/external-reference acceptance criteria frozen in `bmad-spec`.

## Sources

Primary sources checked on 2026-08-23:

- https://nodejs.org/en/about/previous-releases
- https://docs.astral.sh/uv/reference/cli/
- https://designmd.directory/
- https://designmd.directory/llms.txt
- https://designmd.directory/ai.txt
- https://designmd.directory/tools
- https://developers.figma.com/docs/plugins/api/ExportSettings/
- https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/
- https://help.penpot.app/user-guide/export-import/exporting-layers/
